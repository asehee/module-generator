import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { GeneratorOptions } from './cli';
import * as templateUtils from './utils/template.utils';

export class Generator {
  private templatePath: string;
  private options: GeneratorOptions;
  private projectPath: string;

  constructor() {
    this.templatePath = path.join(__dirname, 'templates');
    // 임시 초기화 - 실제 값은 generate 메서드에서 설정됨
    this.options = {
      projectName: '',
      authentication: false,
      docker: false,
      testing: false,
      swagger: false
    };
    this.projectPath = '';
  }

  async generate(options: GeneratorOptions): Promise<void> {
    this.options = options;
    this.projectPath = path.join(process.cwd(), options.projectName);

    this.createProjectFolder();
    this.initializePackageJson();
    this.setupTypeScript();
    this.copyBaseTemplates();
    this.setupDatabase();
    
    // 선택된 옵션에 따라 템플릿 추가
    if (options.authentication) {
      this.setupAuthentication();
    }
    
    if (options.docker) {
      this.setupDocker();
    }
    
    if (options.testing) {
      this.setupTesting();
    }
    
    if (options.swagger) {
      this.setupSwagger();
    }
    
    this.createModules();
    
    console.log(chalk.green.bold(`${options.projectName} 프로젝트가 성공적으로 생성되었습니다!`));
    console.log(chalk.cyan(`
프로젝트를 시작하려면:
  cd ${options.projectName}
  npm install
  npm run dev
    `));
  }

  private createProjectFolder(): void {
    if (fs.existsSync(this.projectPath)) {
      console.error(chalk.red(`${this.options.projectName} 폴더가 이미 존재합니다.`));
      process.exit(1);
    }
    
    fs.mkdirSync(this.projectPath);
      console.log(chalk.green(`${this.options.projectName} 프로젝트 폴더 생성 완료`));
  }

// 개선된 initializePackageJson 함수
private initializePackageJson(): void {
  // 기본 package.json 템플릿 경로
  const packageJsonTemplate = path.join(this.templatePath, 'base', 'package.json.tmpl');
  
  try {
    // 템플릿 내용 읽기
    let templateContent = fs.readFileSync(packageJsonTemplate, 'utf-8');
    
    // 템플릿 처리
    let processedContent = templateUtils.processTemplate(
      templateContent, 
      { projectName: this.options.projectName }
    );
    
    // 템플릿 처리 후 특수 문자나 개행 문제 정리
    processedContent = processedContent.replace(/\\n/g, '\n').trim();
    
    // JSON 파싱 시도
    let packageJson;
    try {
      packageJson = JSON.parse(processedContent);
    } catch (parseError) {
      console.error("JSON 파싱 오류:", (parseError as Error).message);
      console.log("문제가 발생한 처리된 내용:", processedContent);
      
      // 대안: 기본 package.json 생성
      packageJson = {
        "name": this.options.projectName,
        "version": "1.0.0",
        "description": "Generated with Express TypeScript Generator",
        "main": "dist/index.js",
        "scripts": {
          "start": "node dist/index.js",
          "dev": "nodemon --exec ts-node src/index.ts",
          "build": "tsc"
        },
        "dependencies": {
          "express": "^4.18.2",
          "sequelize": "^6.35.1",
          "mysql2": "^3.6.3"
        },
        "devDependencies": {
          "@types/express": "^4.17.21",
          "typescript": "^5.2.2",
          "ts-node": "^10.9.1",
          "nodemon": "^3.0.1"
        }
      };
    }
    
    // 선택된 옵션에 따라 패키지 추가
    if (this.options.authentication) {
      packageJson.dependencies["jsonwebtoken"] = "^9.0.2";
      packageJson.dependencies["bcrypt"] = "^5.1.1";
      packageJson.devDependencies["@types/jsonwebtoken"] = "^9.0.5";
      packageJson.devDependencies["@types/bcrypt"] = "^5.0.2";
    }
    
    if (this.options.swagger) {
      packageJson.dependencies["swagger-ui-express"] = "^5.0.0";
      packageJson.devDependencies["@types/swagger-ui-express"] = "^4.1.6";
    }
    
    if (this.options.testing) {
      packageJson.devDependencies["jest"] = "^29.7.0";
      packageJson.devDependencies["@types/jest"] = "^29.5.8";
      packageJson.devDependencies["supertest"] = "^6.3.3";
      packageJson.devDependencies["@types/supertest"] = "^2.0.16";
      packageJson.scripts["test"] = "jest";
    }
    
    // 파일 저장
    fs.writeFileSync(
      path.join(this.projectPath, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );
    
    console.log("package.json 생성 완료");
  } catch (error) {
    console.error("package.json 생성 실패:", error);
    throw error;
  }
}

  private setupTypeScript(): void {
    // TypeScript 관련 파일 복사
    this.copyTemplate('base/tsconfig.json.tmpl', 'tsconfig.json');
    
    console.log(chalk.green('TypeScript 설정 완료'));
  }

  private copyBaseTemplates(): void {
    const srcDir = path.join(this.projectPath, 'src');
    
    // src 폴더 생성
    if (!fs.existsSync(srcDir)) {
      fs.mkdirSync(srcDir, { recursive: true });
    }
    
    // 기본 폴더 구조 생성
    ['config', 'middlewares', 'modules', 'utils', 'interfaces', 'types'].forEach(dir => {
      fs.mkdirSync(path.join(srcDir, dir), { recursive: true });
    });
    
    // 기본 파일 복사
    this.copyTemplate('base/src/app.ts.tmpl', 'src/app.ts');
    this.copyTemplate('base/src/index.ts.tmpl', 'src/index.ts');
    this.copyTemplate('base/src/utils/logger.ts.tmpl', 'src/utils/logger.ts');
    this.copyTemplate('base/src/config/index.ts.tmpl', 'src/config/index.ts');
    this.copyTemplate('base/.env.tmpl', '.env');
    this.copyTemplate('base/.gitignore.tmpl', '.gitignore');
    this.copyTemplate('base/README.md.tmpl', 'README.md');
    
    console.log(chalk.green('기본 프로젝트 구조 생성 완료'));
  }

  private setupDatabase(): void {
    const dbDir = path.join(this.projectPath, 'src', 'config', 'database');
    
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    
    // MySQL + Sequelize 설정 파일 복사
    this.copyTemplate('database/mysql/index.ts.tmpl', 'src/config/database/index.ts');
    
    console.log(chalk.green('MySQL + Sequelize 데이터베이스 설정 완료'));
  }

  private setupAuthentication(): void {
    // 인증 미들웨어 복사
    this.copyTemplate('auth/auth.middleware.ts.tmpl', 'src/middlewares/auth.middleware.ts');
    
    // 인증 모듈 생성
    this.createModule('auth');
    
    console.log(chalk.green('인증 설정 완료'));
  }

  private setupDocker(): void {
    // Dockerfile 복사
    this.copyTemplate('docker/Dockerfile.tmpl', 'Dockerfile');
    
    // docker-compose.yml 복사
    this.copyTemplate('docker/docker-compose.mysql.yml.tmpl', 'docker-compose.yml');
    
    console.log(chalk.green('Docker 설정 완료'));
  }

  private setupTesting(): void {
    // Jest 설정 파일 복사
    this.copyTemplate('testing/jest.config.ts.tmpl', 'jest.config.ts');
    
    // 테스트 폴더 생성
    const testDir = path.join(this.projectPath, 'src', 'tests');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    // 기본 테스트 파일 복사
    this.copyTemplate('testing/app.test.ts.tmpl', 'src/tests/app.test.ts');
    
    console.log(chalk.green('테스트 설정 완료'));
  }

  private setupSwagger(): void {
    // Swagger 설정 파일 복사
    this.copyTemplate('swagger/swagger.ts.tmpl', 'src/config/swagger.ts');
    
    console.log(chalk.green('Swagger 설정 완료'));
  }

  private createModules(): void {
    // user 모듈은 기본으로 생성
    this.createModule('user');
    
    console.log(chalk.green('모듈 생성 완료'));
  }

  private createModule(moduleName: string): void {
    const moduleDir = path.join(this.projectPath, 'src', 'modules', moduleName);
    
    if (!fs.existsSync(moduleDir)) {
      fs.mkdirSync(moduleDir, { recursive: true });
    }
    
    console.log(chalk.blue(`${moduleName} 모듈 생성 중...`));
    
    // auth 모듈의 경우 특별한 템플릿 사용
    if (moduleName === 'auth') {
      this.createAuthModule(moduleDir);
      return;
    }
    
    // 기본 모듈 템플릿 파일들
    const moduleFiles = [
      { template: 'index.ts.tmpl', output: 'index.ts' },
      { template: '{{moduleName}}.controller.ts.tmpl', output: `${moduleName}.controller.ts` },
      { template: '{{moduleName}}.service.ts.tmpl', output: `${moduleName}.service.ts` },
      { template: '{{modulelName}}.model.ts.tmpl', output: `${moduleName}.model.ts` }, // 템플릿에 오타가 있는 경우
      { template: '{{moduleName}}.interface.ts.tmpl', output: `${moduleName}.interface.ts` },
      { template: '{{moduleName}}.validation.ts.tmpl', output: `${moduleName}.validation.ts` },
      { template: '{{moduleName}}.routes.ts.tmpl', output: `${moduleName}.routes.ts` }
    ];
    
    const defaultTemplatePath = path.join(this.templatePath, 'modules', 'default');
    
    moduleFiles.forEach(({ template, output }) => {
      const templateFilePath = path.join(defaultTemplatePath, template);
      const outputFilePath = path.join(moduleDir, output);
      
      if (fs.existsSync(templateFilePath)) {
        const templateContent = fs.readFileSync(templateFilePath, 'utf-8');
        const processedContent = templateUtils.processTemplate(
          templateContent, 
          { moduleName: moduleName }
        );
        
        fs.writeFileSync(outputFilePath, processedContent);
      } else {
      }
    });
  }
  
  // auth 모듈 전용 생성 함수 추가
  private createAuthModule(moduleDir: string): void {
    const authTemplatePath = path.join(this.templatePath, 'auth');
    
    const authFiles = [
      { template: 'index.ts.tmpl', output: 'index.ts' },
      { template: 'auth.controller.ts.tmpl', output: 'auth.controller.ts' },
      { template: 'auth.routes.ts.tmpl', output: 'auth.routes.ts' },
      { template: 'auth.validation.ts.tmpl', output: 'auth.validation.ts' },
      { template: 'auth.middleware.ts.tmpl', output: 'auth.middleware.ts' }
    ];
    
    authFiles.forEach(({ template, output }) => {
      const templateFilePath = path.join(authTemplatePath, template);
      const outputFilePath = path.join(moduleDir, output);
      
      if (fs.existsSync(templateFilePath)) {
        const templateContent = fs.readFileSync(templateFilePath, 'utf-8');
        const processedContent = templateUtils.processTemplate(
          templateContent, 
          { moduleName: 'auth' }
        );
        
        fs.writeFileSync(outputFilePath, processedContent);
      } else {
      }
    });
  }

  private copyTemplate(templateFile: string, destFile: string, extraVars: Record<string, any> = {}): void {
    const templatePath = path.join(this.templatePath, templateFile);
    const destPath = path.join(this.projectPath, destFile);
    
    // 템플릿 디렉토리 확인
    const destDir = path.dirname(destPath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    
    // 템플릿 파일이 존재하면 처리
    if (fs.existsSync(templatePath)) {
      const templateContent = fs.readFileSync(templatePath, 'utf-8');
      const processedContent = templateUtils.processTemplate(
        templateContent, 
        { ...this.options, ...extraVars }
      );
      
      fs.writeFileSync(destPath, processedContent);
    }
  }
  // src/generator.ts에 추가
public async createModuleInProject(moduleName: string): Promise<void> {
    // 현재 디렉토리가 프로젝트 루트인지 확인
    if (!fs.existsSync('src') || !fs.existsSync('package.json')) {
      console.error(chalk.red('현재 디렉토리가 Express 프로젝트 루트가 아닙니다.'));
      console.error(chalk.yellow('Express 프로젝트 루트 디렉토리에서 이 명령어를 실행하세요.'));
      process.exit(1);
    }
  
    // 모듈 디렉토리 경로
    const moduleDir = path.join('src', 'modules', moduleName);
    
    // 이미 존재하는 모듈인지 확인
    if (fs.existsSync(moduleDir)) {
      console.error(chalk.red(`${moduleName} 모듈이 이미 존재합니다.`));
      process.exit(1);
    }
  
    // 모듈 디렉토리 생성
    fs.mkdirSync(moduleDir, { recursive: true });
    
    // 모듈 파일 생성
    const files = [
      'index.ts',
      `${moduleName}.controller.ts`,
      `${moduleName}.service.ts`,
      `${moduleName}.model.ts`,
      `${moduleName}.interface.ts`,
      `${moduleName}.validation.ts`,
      `${moduleName}.routes.ts`
    ];
    
    const templateDir = path.join(this.templatePath, 'modules', 'default');
    
    // 각 파일 생성
    for (const file of files) {
      const templatePath = path.join(templateDir, `${file}.tmpl`);
      const destPath = path.join(moduleDir, file.replace('{{moduleName}}', moduleName));
      
      if (fs.existsSync(templatePath)) {
        const templateContent = fs.readFileSync(templatePath, 'utf-8');
        const processedContent = templateUtils.processTemplate(
          templateContent, 
          { moduleName }
        );
        
        fs.writeFileSync(destPath, processedContent);
        console.log(chalk.green(`${destPath} 파일 생성 완료`));
      } else {
        console.warn(chalk.yellow(`${templatePath} 템플릿을 찾을 수 없습니다.`));
      }
    }
  
    // 모듈 생성 완료 메시지
    console.log(chalk.green.bold(`${moduleName} 모듈이 성공적으로 생성되었습니다!`));
    
    // app.ts 파일에 모듈 라우트 추가 안내
    console.log(chalk.cyan(`
  다음 코드를 src/app.ts 파일에 추가하세요:
  
  import ${moduleName}Routes from './modules/${moduleName}';
  app.use('/api/${moduleName}s', ${moduleName}Routes);
    `));
  }
}