# 아카이브 줄바꿈 및 Git 인덱스 무결성 수정

2026-10-29, 기준 커밋 `8b88894`. 제품 코드·카탈로그·기존 테스트·보존 SHA-256은 변경하지 않았다.

## 원인과 적용 설정

Windows의 `core.autocrlf=true`에서 원본 CRLF 파일이 Git 인덱스에 LF로 저장됐다. 기존 `archive/model-recommendation-2026-10-29/.gitattributes`는 해당 폴더만 보호하고 있었으며 루트 `.gitattributes`는 없었다. Linux 체크아웃에서는 정규화된 LF 바이트가 그대로 복원되어 보존 해시 검사가 실패했다.

실패 파일 `archive/research-2026-10-29/docs/chatkhu-contrast-check.json`:

- 원본/작업 폴더 SHA-256: `3f46b2efdaed56a9e5e3d51c2916268b30eee45526ab36a476b19c79d9b9df42`
- 수정 전 실제 인덱스 SHA-256: `82b26c0c6f91d85c387430a5edd8b619507d431703282962c996ec161712b5e0`

루트 `.gitattributes`에 **`archive/** -text`**를 적용했다. 원래 LF·CRLF·바이너리를 모두 그대로 저장·체크아웃하며, 다른 제품 파일의 줄바꿈 정책과 사용자 Git 설정은 바꾸지 않는다. 기존 하위 속성 파일과도 충돌하지 않는다. 같은 규칙의 `whitespace`에는 기본 검사인 `blank-at-eol,blank-at-eof,space-before-tab`과 `cr-at-eol`을 명시했다. 원본 CRLF를 복원한 차이에서 CR 자체를 후행 공백 오류로 오인하지 않게 하며 기본 공백 검사는 유지한다.

## 전체 감사 결과

| 범위 | 수정 전 작업 폴더 | 수정 전 실제 인덱스 | 검증용 재스테이징 인덱스 |
| --- | --- | --- | --- |
| `production-cleanup-preservation.json`의 81개 경로(이동 80 + 중복 원본 1) | 모두 원본 해시 일치 | 17개 불일치 | 모두 일치 |
| 전체 정리 목록의 보존 원본 236개 | 모두 원본 해시 일치 | 59개 불일치 | 모두 일치 |
| 추적 아카이브 전체 240개 | 수정 전 바이트 그대로 보존 | 위 59개 외에 보존 매니페스트 자체도 작업 폴더와 줄바꿈 차이 | 240개 모두 작업 폴더와 바이트 일치 |

기록된 원본과 인덱스의 59개 불일치는 모두 CRLF/LF 차이였다. 해시 기대값을 바꾸거나 무결성 검사를 제거하지 않았다. 아카이브 240개 파일의 작업 폴더 바이트는 수정 전 보존본과 모두 동일하다. 보존 기록이 없는 안내 문서 등을 새 원본 해시로 임의 등록하지 않았다.

**이 실행 환경에서는 실제 `.git/index.lock` 생성이 `Permission denied`로 거부되어 실제 인덱스 재스테이징을 완료하지 못했다.** `.qa` 안에 원래 인덱스의 사본과 별도 객체 디렉터리를 만들고 동일한 `git add --renormalize -- archive`를 적용해 검증했다. 실제 인덱스는 시작 시점과 바이트가 같으며 59개 불일치가 아직 남아 있다. 별도 인덱스를 실제 인덱스에 덮어쓰지 않는다.

## 수행한 검증

- 수정 전 인덱스를 `core.autocrlf=false`, `core.eol=lf`로 새 폴더에 체크아웃하자 기존 테스트에서 같은 파일·같은 해시로 실패했다.
- 수정 설정을 포함한 별도 인덱스에서 blob 원문을 읽어 236개 기록 해시 및 아카이브 전체 240개 작업 파일과 대조했다. 모두 일치했다.
- 별도 인덱스를 LF 설정과 Windows `core.autocrlf=true` 설정으로 각각 새 폴더에 체크아웃했다. 두 경우 모두 아카이브 240개가 인덱스 바이트와 일치했다.
- 원래 작업 폴더의 `npm test`: **102/102 통과**.
- LF 설정 체크아웃의 `npm test`: **102/102 통과**. Windows 설정 체크아웃의 격리/보존 테스트: **5/5 통과**.
- `npm run typecheck`, `npm run data:validate`: 통과(12개 회사·13개 서비스·18개 플랜).
- `npm run build`: Vite 설정을 읽는 esbuild 프로세스에서 `spawn EPERM`으로 실패. 이번 환경에서 빌드 성공이나 배포 성공을 주장하지 않는다.
- `git diff --check` 및 수정 설정을 적용한 별도 인덱스의 `git diff --cached --check`: 통과.
- `git apply --cached --check`만 사용해 실제 변경 없이 공백 검사를 확인했다. 정상 CRLF 변경은 통과하고, 행 끝에 공백 2개를 넣은 변경은 `trailing whitespace`로 거부됐다.

Linux 설정 체크아웃 실험은 Windows에서 Git의 변환 설정을 바꿔 수행했다. 실제 Ubuntu/GitHub Actions 실행은 하지 않았다. 로그·인덱스 감사·바이트 대조 결과는 로컬 `.qa/archive-*.json`, `.qa/archive-*.log`에 있다.

## 일반 PowerShell에서 필요한 스테이징

현재 파일을 유지한 상태에서 저장소 루트의 일반 PowerShell에서 실행한다. 정상 작업 폴더의 원본이 이미 검증됐으므로 파일 내용을 편집하거나 SHA-256을 변경할 필요는 없다.

```powershell
git add -- .gitattributes docs/archive-byte-preservation.md
git add --renormalize -- archive
git diff --cached --stat
git ls-files --eol archive
git diff --check
git diff --cached --check
npm test
npm run typecheck
npm run data:validate
npm run build
```

`--renormalize`는 새 `-text` 속성 아래에서 **검증된 작업 파일의 원래 바이트를 다시 인덱스에 저장**하는 용도다. 아카이브가 변경으로 보이는 것은 원본 복원에 따른 blob 차이다. `.gitattributes`와 아카이브 복원은 같은 변경에 포함해야 한다.

## Linux에서 인덱스 및 체크아웃 검증 재현

아래는 Git과 Python 3이 있는 Ubuntu/Git Bash 환경의 저장소 루트에서 실행할 수 있다. 실제 인덱스의 모든 아카이브 blob, 기록된 원본 236개, 작업 폴더의 바이트와 `-text` 속성을 검사한다. 아직 재스테이징하지 않았다면 실패해야 한다.

```bash
python3 - <<'PY'
import hashlib, json, pathlib, subprocess
def git(*args, data=None):
    return subprocess.check_output(['git', *args], input=data)
inventory = json.loads(pathlib.Path('docs/production-cleanup-manifest.json').read_text(encoding='utf-8'))
expected = {r['destination'] if r['action'] == 'move' else r['path']: r['sha256']
            for r in inventory['files'] if r['category'] == 'ARCHIVE'}
manifest = json.loads(pathlib.Path('archive/production-cleanup-preservation.json').read_text(encoding='utf-8'))
for r in manifest['movedFiles']:
    assert expected[r['path']] == r['sha256']
for r in manifest['removedDuplicates']:
    assert expected[r['retainedPath']] == r['sha256']
paths = git('ls-files', '-z', '--', 'archive').decode('utf-8').rstrip('\0').split('\0')
attributes = git('check-attr', '--cached', '-z', '--stdin', 'text', data=('\0'.join(paths)+'\0').encode('utf-8')).decode('utf-8').rstrip('\0').split('\0')
assert all(attributes[i:i+2] == ['text', 'unset'] for i in range(1, len(attributes), 3))
blobs = git('cat-file', '--batch', data=''.join(':'+p+'\n' for p in paths).encode('utf-8'))
offset = 0
checked = set()
for path in paths:
    end = blobs.index(b'\n', offset)
    _, kind, size = blobs[offset:end].decode().split()
    assert kind == 'blob', path
    start = end+1
    data = blobs[start:start+int(size)]
    offset = start+int(size)+1
    assert data == pathlib.Path(path).read_bytes(), path
    if path in expected:
        assert hashlib.sha256(data).hexdigest() == expected[path], path
        checked.add(path)
assert checked == set(expected)
print(f'PASS: {len(paths)} archive blobs; {len(checked)} original SHA-256 records')
PY
```

Linux 설정의 새 체크아웃에서 기존 보존 테스트를 다시 실행한다:

```bash
archive_checkout=$(mktemp -d)
git -c core.autocrlf=false -c core.eol=lf checkout-index --all --prefix="$archive_checkout/"
(cd "$archive_checkout" && node --test --test-isolation=none tests/provider-isolation.test.mjs)
```

이 명령은 인덱스에서 읽으므로 새 `.gitattributes`까지 스테이징된 상태여야 한다. 새 폴더의 테스트는 Node 내장 기능만 사용하므로 별도 npm 설치가 필요 없다. 전체 빌드 검증은 일반 개발 환경 또는 새 커밋의 GitHub Actions에서 실행한다.

사용자가 수정 내용을 검토·커밋하고 `main`에 반영한 다음 새 Actions 실행을 시작한다. 예전 실패 실행의 단순 재실행은 예전 커밋을 사용하므로 새 수정 검증을 대신하지 못한다. 이번 작업에서는 commit·push·배포를 실행하지 않았다.
