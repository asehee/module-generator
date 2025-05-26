// src/cli.ts
import inquirer from 'inquirer';
import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import { Generator } from './generator';
import * as templateUtils from './utils/template.utils';

export interface GeneratorOptions {
  projectName: string;
  authentication: boolean;
  docker: boolean;
  testing: boolean;
  swagger: boolean;
}

export class CLI {
  private generator: Generator;
  private templatePath: string;

  constructor() {
    this.generator = new Generator();
    this.templatePath = path.join(__dirname, 'templates');
  }

  async run(): Promise<void> {
    console.log(chalk.blue.bold('Express.js + TypeScript + MySQL + Sequelize 프로젝트 생성기에 오신 것을 환영합니다! 🚀'));
    const options = await this.promptOptions();
    await this.generator.generate(options);
  }

  async generateModule(moduleName?: string): Promise<void> {
    // 현재 작업 디렉토리 확인 (이미 생성된 프로젝트 내에서 실행되어야 함)
    const projectPath = process.cwd();
    console.log(chalk.blue(`현재 디렉토리: ${projectPath}`));
    
    // package.json이 있는지 확인하여 Express 프로젝트인지 검증
    if (!fs.existsSync(path.join(projectPath, 'package.json'))) {
      throw new Error('유효한 Express 프로젝트가 아닙니다. package.json 파일이 없습니다.');
    }
    
    // 모듈 이름이 제공되지 않은 경우 사용자에게 물어봅니다
    if (!moduleName) {
      const answer = await inquirer.prompt([
        {
          type: 'input',
          name: 'moduleName',
          message: '생성할 모듈 이름을 입력하세요:',
          validate: (input) => {
            if (!input.trim()) {
              return '모듈 이름은 필수입니다';
            }
            return true;
          }
        }
      ]);
      moduleName = answer.moduleName;
    }

    // 추가 옵션 질문
    const { moduleType } = await inquirer.prompt([
      {
        type: 'list',
        name: 'moduleType',
        message: '생성할 모듈 타입을 선택하세요:',
        choices: [
          { name: 'Full module (Controller, Service, Model, Routes, Interface, Validation)', value: 'full' },
          { name: 'Controller만', value: 'controller' },
          { name: 'Service만', value: 'service' },
          { name: 'Model만', value: 'model' },
          { name: 'Routes만', value: 'routes' },
          { name: 'Interface만', value: 'interface' },
          { name: 'Validation만', value: 'validation' }
        ],
        default: 'full'
      }
    ]);

    // 모듈 생성
    await this.createModuleInProject(moduleName as string, projectPath as string, moduleType as string);
  }

  async promptOptions(): Promise<GeneratorOptions> {
    const questions = [
      {
        type: 'input',
        name: 'projectName',
        message: '프로젝트 이름을 입력하세요:',
        default: 'express-app'
      },
      {
        type: 'confirm',
        name: 'authentication',
        message: '인증 모듈을 추가하시겠습니까? (JWT 기반)',
        default: true
      },
      {
        type: 'confirm',
        name: 'swagger',
        message: 'Swagger API 문서를 추가하시겠습니까?',
        default: true
      },
      {
        type: 'confirm',
        name: 'docker',
        message: 'Docker 설정을 추가하시겠습니까?',
        default: false
      },
      {
        type: 'confirm',
        name: 'testing',
        message: 'Jest 테스트 설정을 추가하시겠습니까?',
        default: false
      }
    ];

    return inquirer.prompt(questions);
  }

  // 실제 모듈 생성 로직
  private async createModuleInProject(
    name: string, 
    projectPath: string,
    moduleType: string
  ): Promise<void> {
    console.log(chalk.blue(`${name} 모듈 생성 시작...`));
    
    // src 디렉토리 확인
    const srcPath = path.join(projectPath, 'src');
    if (!fs.existsSync(srcPath)) {
      fs.mkdirSync(srcPath, { recursive: true });
      console.log(chalk.yellow('src 디렉토리를 생성했습니다.'));
    }
    
    // modules 디렉토리 생성
    const modulesDir = path.join(srcPath, 'modules');
    if (!fs.existsSync(modulesDir)) {
      fs.mkdirSync(modulesDir, { recursive: true });
      console.log(chalk.yellow('modules 디렉토리를 생성했습니다.'));
    }
    
    // 모듈별 디렉토리 생성
    const moduleDir = path.join(modulesDir, name);
    if (!fs.existsSync(moduleDir)) {
      fs.mkdirSync(moduleDir, { recursive: true });
    } else {
      console.log(chalk.yellow(`${name} 모듈 디렉토리가 이미 존재합니다. 파일을 덮어씁니다.`));
    }
    
    // 템플릿 디렉토리 경로
    const modulesTemplatePath = path.join(this.templatePath, 'modules', 'default');
    
    // 선택한 모듈 타입에 따라 파일 생성
    const filesToGenerate = this.getFilesToGenerate(moduleType);
    
    // 각 파일 생성
    for (const fileType of filesToGenerate) {
      const templateFileName = this.getTemplateFileName(fileType, name);
      const targetFileName = this.getTargetFileName(fileType, name);
      
      const templateFilePath = path.join(modulesTemplatePath, templateFileName);
      const targetFilePath = path.join(moduleDir, targetFileName);
      
      if (fs.existsSync(templateFilePath)) {
        const templateContent = fs.readFileSync(templateFilePath, 'utf-8');
        const processedContent = templateUtils.processTemplate(templateContent, { 
          moduleName: name,
          ModuleName: this.capitalizeFirst(name)
        });
        
        fs.writeFileSync(targetFilePath, processedContent);
        console.log(chalk.green(`${targetFileName} 생성 완료`));
      } else {
        console.log(chalk.red(`템플릿 파일을 찾을 수 없습니다: ${templateFileName}`));
      }
    }
    
    console.log(chalk.green(`${name} 모듈 생성 완료`));
  }

  private getFilesToGenerate(moduleType: string): string[] {
    switch (moduleType) {
      case 'controller':
        return ['controller'];
      case 'service':
        return ['service'];
      case 'model':
        return ['model'];
      case 'routes':
        return ['routes'];
      case 'interface':
        return ['interface'];
      case 'validation':
        return ['validation'];
      case 'full':
      default:
        return ['controller', 'service', 'model', 'routes', 'interface', 'validation', 'index'];
    }
  }

  private getTemplateFileName(fileType: string, moduleName: string): string {
    switch (fileType) {
      case 'controller':
        return '{{moduleName}}.controller.ts.tmpl';
      case 'service':
        return '{{moduleName}}.service.ts.tmpl';
      case 'model':
        return '{{modulelName}}.model.ts.tmpl'; // typo in template name
      case 'routes':
        return '{{moduleName}}.routes.ts.tmpl';
      case 'interface':
        return '{{moduleName}}.interface.ts.tmpl';
      case 'validation':
        return '{{moduleName}}.validation.ts.tmpl';
      case 'index':
        return 'index.ts.tmpl';
      default:
        return '';
    }
  }

  private getTargetFileName(fileType: string, moduleName: string): string {
    switch (fileType) {
      case 'controller':
        return `${moduleName}.controller.ts`;
      case 'service':
        return `${moduleName}.service.ts`;
      case 'model':
        return `${moduleName}.model.ts`;
      case 'routes':
        return `${moduleName}.routes.ts`;
      case 'interface':
        return `${moduleName}.interface.ts`;
      case 'validation':
        return `${moduleName}.validation.ts`;
      case 'index':
        return 'index.ts';
      default:
        return '';
    }
  }

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

export async function runCli(): Promise<void> {
  const cli = new CLI();
  await cli.run();
}

export async function generateModule(name: string): Promise<void> {
  const cli = new CLI();
  await cli.generateModule(name);
}