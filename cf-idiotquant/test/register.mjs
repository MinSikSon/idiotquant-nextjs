// alias-hooks 를 모듈 해석기로 등록한다. package.json 의 test 스크립트가 --import 로 부른다.
import { register } from "node:module";
register("./alias-hooks.mjs", import.meta.url);
