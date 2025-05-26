/**
 * 템플릿 문자열을 처리하는 유틸리티 함수
 * @param template 템플릿 문자열
 * @param vars 치환할 변수들
 * @returns 처리된 텍스트
 */
export const processTemplate = (template: string, vars: Record<string, any>): string => {
  let result = template;
  
  // 디버깅을 위한 로그
  console.log('처리할 변수들:', Object.keys(vars));
  
  // 조건부 블록 처리 ({{#if 조건}}...{{/if}})
  Object.keys(vars).forEach(key => {
    // 긍정 조건
    const ifRegex = new RegExp(`{{\\s*#if\\s+${key}\\s*}}([\\s\\S]*?){{\\s*/if\\s*}}`, 'g');
    result = result.replace(ifRegex, (match, content) => {
      console.log(`조건 처리: #if ${key} = ${vars[key]}, 내용 길이: ${content.length}`);
      return vars[key] ? content : '';
    });
    
    // 부정 조건
    const ifNotRegex = new RegExp(`{{\\s*#if\\s+!${key}\\s*}}([\\s\\S]*?){{\\s*/if\\s*}}`, 'g');
    result = result.replace(ifNotRegex, (match, content) => {
      console.log(`조건 처리: #if !${key} = ${!vars[key]}, 내용 길이: ${content.length}`);
      return !vars[key] ? content : '';
    });
    
    // 동등 비교 조건
    const ifEqRegex = new RegExp(`{{\\s*#if_eq\\s+${key}\\s+=\\s+([\\w]+)\\s*}}([\\s\\S]*?){{\\s*/if_eq\\s*}}`, 'g');
    result = result.replace(ifEqRegex, (match, value, content) => {
      console.log(`조건 처리: #if_eq ${key} = ${value}, 비교 결과: ${vars[key] === value}, 내용 길이: ${content.length}`);
      return vars[key] === value ? content : '';
    });
  });
  
  // Helper 함수 처리 - capitalizeFirstLetter
  const helperRegex = /{{capitalizeFirstLetter\s+(\w+)}}/g;
  result = result.replace(helperRegex, (match, varName) => {
    if (vars[varName] !== undefined) {
      return capitalizeFirstLetter(vars[varName]);
    }
    return match;
  });
  
  // 템플릿 변수 치환 ({{변수명}})
  Object.keys(vars).forEach(key => {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    result = result.replace(regex, vars[key]?.toString() || '');
  });
  
  // 처리되지 않은 템플릿 변수/조건 확인
  const remainingTemplateVars = result.match(/{{.*?}}/g);
  if (remainingTemplateVars) {
    console.warn('경고: 처리되지 않은 템플릿 변수/조건:', remainingTemplateVars);
  }
  
  return result;
};
export function processJsonTemplate(template: string, data: Record<string, any>): Record<string, any> {
  const processed = processTemplate(template, data);
  try {
    return JSON.parse(processed);
  } catch (error) {
    console.error("JSON 템플릿 처리 오류:", (error as Error).message);
    throw new Error(`JSON 파싱 오류: ${error as Error}`);
  }
}

/**
 * 첫 글자를 대문자로 변환
 * @param str 변환할 문자열
 * @returns 변환된 문자열
 */
export const capitalizeFirstLetter = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};