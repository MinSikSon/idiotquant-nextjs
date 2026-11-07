import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { createRequire } from "node:module";
import ts from "typescript";

const require = createRequire(import.meta.url);
const source = ts.transpileModule(readFileSync(new URL("../components/balance/rebalancingExecutionPanel.tsx", import.meta.url),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const run = {id:"run-one",status:"waiting",created_at:1,updated_at:1,phase:"buy",reason:"accepted",cash_minor:1000,stop_requested:false,skipped:[],preview:null,orders:[{symbol:"A",side:"buy",quantity:2,price_minor:100,status:"accepted",broker_id:"1",filled_quantity:0,filled_minor:0}]};
function panel(overrides:Record<string,unknown>={}) {
  const states:any[]=[], calls:any[]=[], effects:(()=>any)[]=[];
  let cursor=0,mounted=false,timer:()=>void=()=>{};
  const document={hidden:false,addEventListener(){},removeEventListener(){}};
  const props={policy:{targets:[]},currency:"KRW",canExecute:true,onAction:async(action:string,body:unknown)=>{calls.push({action,body});return action==="runs"?{runs:[]}:{run};},...overrides};
  const exports:any={};
  runInNewContext(source,{exports,document,crypto,setInterval(fn:()=>void){timer=fn;return 1;},clearInterval(){},require(name:string){
    if(name!=="react")return require(name);
    return {useState(initial:any){const i=cursor++;if(!(i in states))states[i]=initial;return [states[i],(next:any)=>states[i]=typeof next==="function"?next(states[i]):next];},useRef(initial:any){return states[cursor++]??={current:initial};},useEffect(effect:()=>any){if(!mounted)effects.push(effect);}};
  }});
  const render=()=>{cursor=0;return exports.default(props);};
  const nodes=(node:any):any[]=>!node||typeof node!=="object"?[]:Array.isArray(node)?node.flatMap(nodes):[node,...nodes(node.props?.children)];
  const text=(node:any):string=>typeof node==="string"||typeof node==="number"?String(node):Array.isArray(node)?node.map(text).join(""):node?.props?text(node.props.children):"";
  const button=(label:string)=>{const node=nodes(render()).find(n=>n.type==="button"&&text(n)===label);assert.ok(node,label);return node;};
  const click=(label:string)=>{const node=button(label);if(!node.props.disabled)return node.props.onClick();};
  const change=(label:string,value:string)=>{const node=nodes(render()).find(n=>n.type==="label"&&text(n).startsWith(label));assert.ok(node);nodes(node).find(n=>n.type==="input").props.onChange({target:{value}});};
  render();mounted=true;const cleanups=effects.map(effect=>effect());
  return {calls,props,render,text,button,click,change,document,tick:()=>timer(),cleanup:()=>cleanups.forEach(fn=>fn?.())};
}
const flush=async()=>{await Promise.resolve();await Promise.resolve();await Promise.resolve();};

test("저장된 미리보기 없이는 실제 실행 차단·응답 유실 재시도 키 보존",async()=>{
  const blocked=panel({canExecute:false});await flush();assert.equal(blocked.button("실제 주문 실행").props.disabled,true);blocked.cleanup();
  const calls:any[]=[];let fail=true;
  const h=panel({onAction:async(action:string,body:any)=>{calls.push({action,body});if(action==="runs")return{runs:[]};if(fail)throw Error("lost response");return{run};}});
  await flush();await h.click("실제 주문 실행");assert.match(h.text(h.render()),/요청 결과를 확인하지/);
  fail=false;await h.click("실제 주문 실행");
  const submits=calls.filter(c=>c.action==="execute");assert.equal(submits.length,2);assert.equal(submits[0].body.request_key,submits[1].body.request_key);
  assert.equal(h.button("실제 주문 실행").props.disabled,true);h.cleanup();
});

test("확인 필요 주문의 연결 입력 검증·중단 시 실행 ID 전달",async()=>{
  const calls:any[]=[];const unknown={...run,status:"needs_review",reason:"order_response_unknown",orders:[{...run.orders[0],status:"unknown",broker_id:undefined}]};
  const h=panel({onAction:async(action:string,body:any)=>{calls.push({action,body});return action==="runs"?{runs:[unknown]}:{run};}});await flush();
  assert.equal(h.button("주문번호 연결·체결 조회").props.disabled,true);
  h.change("증권사 주문번호","123");h.change("증권사 주문일자","20261109");
  await h.click("주문번호 연결·체결 조회");assert.deepEqual(JSON.parse(JSON.stringify(calls.at(-1).body)),{run_id:"run-one",broker_id:"123",broker_date:"20261109"});
  await h.click("남은 주문 중단");assert.equal(calls.at(-1).action,"stop");assert.equal(calls.at(-1).body.run_id,"run-one");h.cleanup();
});

test("숨김 시 폴링 중단·조회 실패 시 기존 실행 유지",async()=>{
  let reads=0,fail=false;
  const h=panel({onAction:async()=>{reads++;if(fail)throw Error("network");return{runs:[run]};}});await flush();
  h.document.hidden=true;h.tick();await flush();assert.equal(reads,1);
  h.document.hidden=false;fail=true;h.tick();await flush();assert.equal(reads,2);assert.match(h.text(h.render()),/마지막 조회 결과/);assert.match(h.text(h.render()),/run-one/);h.cleanup();
});
