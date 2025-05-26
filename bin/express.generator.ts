#!/usr/bin/env node
// bin/express-generator.ts

import { runCli, generateModule } from '../src/cli';

// 명령행 인수 파싱
const args = process.argv.slice(2);

// 디버깅을 위한 출력
console.log('명령행 인수:', args);

// 메인 함수 실행
(async () => {
  try {
    // 첫 번째 인수가 'generate:module'인지 확인
    if (args.length >= 2 && args[0] === 'generate:module') {
      const moduleName = args[1];
      console.log(`모듈 생성 모드: ${moduleName}`);
      await generateModule(moduleName);
    } 
    // 도움말 확인
    else if (args.includes('help') || args.includes('--help') || args.includes('-h')) {
      showHelp();
    } 
    // 기본 프로젝트 생성
    else {
      console.log('프로젝트 생성 모드');
      await runCli();
    }
  } catch (error) {
    console.error('CLI 실행 중 오류 발생:', error);
    process.exit(1);
  }
})();

function showHelp() {
  console.log(`
Express.js + TypeScript + MySQL + Sequelize 프로젝트 생성기 

사용법:
  express-generator                      새 프로젝트 생성
  express-generator generate:module <name>  기존 프로젝트에 새 모듈 생성
  express-generator help                 도움말 표시

옵션:
  -h, --help                             도움말 표시
  `);
}