import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('공식 마스터 파서는 CP949·대문자 파일명·타입을 처리하고 잘못된 입력을 거부한다', () => {
    execFileSync('python3', ['-c', `
import io, runpy, sys, zipfile
parse = runpy.run_path(sys.argv[1])['parse_master']
def row(symbol, name='종목', kind='2', exchange='NAS'):
    fields = [''] * 24
    fields[2], fields[4], fields[6], fields[7], fields[8] = exchange, symbol, '한글 종목명', name, kind
    return '\\t'.join(fields)
def archive(lines):
    data = io.BytesIO()
    with zipfile.ZipFile(data, 'w') as z:
        info = zipfile.ZipInfo('NASMST.COD', (2026, 10, 16, 17, 10, 16))
        z.writestr(info, ('\\r\\n'.join(lines) + '\\r\\n').encode('cp949'))
    return data.getvalue()
entries, stamp = parse(archive([row('CRWV'), row('AAPL'), row('QQQ', kind='3'), row('WARRANT', kind='4'), row('INDEX', kind='1')]), 'nas')
assert [x['symbol'] for x in entries] == ['AAPL', 'CRWV', 'QQQ', 'WARRANT']
assert entries[0]['name'] == '종목'
assert entries[0]['koreanName'] == '한글 종목명'
assert stamp == '2026-10-16T17:10:16'
for bad in [[], ['<html>upstream error</html>'], [row('AAPL'), row('AAPL')], [row('AAPL', exchange='NYS')], [row('', name='')], [row('AAPL', name='')]]:
    try:
        parse(archive(bad), 'nas')
    except ValueError:
        pass
    else:
        raise AssertionError('Invalid archive was accepted')
`, fileURLToPath(new URL('../scripts/refresh-us-symbols.py', import.meta.url))], { stdio: 'pipe' });
});
