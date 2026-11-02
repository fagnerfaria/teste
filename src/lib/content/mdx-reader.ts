/** MDX is untrusted data. A literal-only parser never evaluates JSX or JavaScript. */
export type ImportedQuiz={question:string;options:{text:string;correct:boolean;explanation:string}[]};
export type ImportedCheckpoint={challenge:string;starterCode:string|null;expected:string|null;kind:"code"|"reflection"|"html"};
export type ParsedExternalLesson={markdown:string;metadata:string;quizzes:ImportedQuiz[];checkpoints:ImportedCheckpoint[]};
type Literal=string|boolean|number|null|Literal[]|{[key:string]:Literal};
function readLiteral(input:string,start:number):{value:Literal;end:number}{
 let position=start;
 const whitespace=()=>{while(/\s/.test(input[position]||'')&&position<input.length)position++;};
 const value=():Literal=>{
  whitespace();const char=input[position];
  if(char==='"'||char==="'"||char==='`'){
   const quote=char;position++;let result='';
   while(position<input.length){
    const next=input[position++];if(next===quote)return result;
    if(quote==='`'&&next==='$'&&input[position]==='{')throw new Error('Template expression is not literal data');
    if(next==='\\'){
     const escaped=input[position++];const escapes:Record<string,string>={n:'\n',r:'\r',t:'\t',b:'\b',f:'\f',v:'\v'};
     if(escaped==='u'){
      const hex=input.slice(position,position+4);if(!/^[a-f\d]{4}$/i.test(hex))throw new Error('Invalid unicode escape');result+=String.fromCharCode(parseInt(hex,16));position+=4;
     }else result+=escapes[escaped||'']??escaped??'';
    }else result+=next;
   }throw new Error('Unclosed literal');
  }
  if(char==='['){
   position++;const array:Literal[]=[];whitespace();
   while(input[position]!==']'){
    array.push(value());whitespace();if(input[position]===','){position++;whitespace();}else if(input[position]!==']')throw new Error('Invalid array');
    if(position>=input.length)throw new Error('Unclosed array');
   }position++;return array;
  }
  if(char==='{'){
   position++;const object:{[key:string]:Literal}=Object.create(null);whitespace();
   while(input[position]!=='}'){
    let key:string;
    if(input[position]==='"'||input[position]==="'")key=String(value());
    else{const match=input.slice(position).match(/^[A-Za-z_$][\w$]*/);if(!match)throw new Error('Invalid key');key=match[0];position+=key.length;}
    if(['__proto__','prototype','constructor'].includes(key))throw new Error('Reserved key');
    whitespace();if(input[position++]!==':')throw new Error('Expected colon');object[key]=value();whitespace();
    if(input[position]===','){position++;whitespace();}else if(input[position]!=='}')throw new Error('Invalid object');
    if(position>=input.length)throw new Error('Unclosed object');
   }position++;return object;
  }
  const primitive=input.slice(position).match(/^(true|false|null|-?\d+(?:\.\d+)?)/);
  if(!primitive)throw new Error('Executable expressions are not permitted');position+=primitive[0].length;
  return primitive[0]==='true'?true:primitive[0]==='false'?false:primitive[0]==='null'?null:Number(primitive[0]);
 };
 const parsed=value();return {value:parsed,end:position};
}
function attribute(tag:string,name:string):Literal|undefined{
 const match=new RegExp('\\b'+name+'\\s*=\\s*').exec(tag);if(!match)return undefined;
 const start=match.index+match[0].length;
 try{
  if(tag[start]==='{'){
   const parsed=readLiteral(tag,start+1);if(tag.slice(parsed.end).trimStart()[0]!=='}')return undefined;return parsed.value;
  }
  return readLiteral(tag,start).value;
 }catch{return undefined;}
}
function replaceWidgets(part:string,replace:(name:string,tag:string)=>string):string{
 const pattern=/<(Quiz|Checkpoint|VisualCheckpoint|Mermaid)\b/g;let result='',previous=0,match:RegExpExecArray|null;
 while((match=pattern.exec(part))){
  let position=pattern.lastIndex;let quote='';let escaped=false;let end=-1;
  for(;position<part.length;position++){
   const char=part[position]!;
   if(quote){if(escaped){escaped=false;continue;}if(char==='\\'){escaped=true;continue;}if(char===quote)quote='';continue;}
   if(char==='"'||char==="'"||char==='`'){quote=char;continue;}
   if(char==='/'&&part[position+1]==='>'){end=position+2;break;}
  }
  if(end<0)break;
  result+=part.slice(previous,match.index)+replace(match[1]!,part.slice(match.index,end));previous=end;pattern.lastIndex=end;
 }
 return result+part.slice(previous);
}
export function parseExternalLesson(raw:string):ParsedExternalLesson{
 const quizzes:ImportedQuiz[]=[];const checkpoints:ImportedCheckpoint[]=[];
 const metadata=raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/)?.[1]||'';
 const content=raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/,'');
 const markdown=content.split(/(^```[^\n]*\n[\s\S]*?^```\s*$)/gm).map((part,index)=>{
  if(index%2)return part;
  return replaceWidgets(part,(name,tag)=>{
   const question=attribute(tag,'question'),options=attribute(tag,'options');
   if(name==='Quiz'&&typeof question==='string'&&Array.isArray(options)){
    const converted=options.map(option=>{
     if(!option||typeof option!=='object'||Array.isArray(option)||typeof option['text']!=='string'||typeof option['correct']!=='boolean')return null;
     return {text:option['text'],correct:option['correct'],explanation:typeof option['explanation']==='string'?option['explanation']:''};
    }).filter((option):option is ImportedQuiz['options'][number]=>option!==null);
    if(converted.length===options.length&&converted.length>=2&&converted.some(o=>o.correct)){quizzes.push({question,options:converted});return '\n';}
   }
   if(name==='Checkpoint'){
    const challenge=attribute(tag,'challenge'),starterCode=attribute(tag,'starterCode'),expected=attribute(tag,'expected');
    if(typeof challenge==='string'){checkpoints.push({challenge,starterCode:typeof starterCode==='string'?starterCode:null,expected:typeof expected==='string'?expected:null,kind:typeof starterCode==='string'?'code':'reflection'});return '\n';}
   }
   if(name==='Mermaid'){const chart=attribute(tag,'chart');if(typeof chart==='string')return '\n```mermaid\n'+chart+'\n```\n';}
   if(name==='VisualCheckpoint'){
    const challenge=attribute(tag,'challenge'),html=attribute(tag,'starterHtml'),css=attribute(tag,'starterCss');
    if(typeof challenge==='string'&&typeof html==='string'){checkpoints.push({challenge,starterCode:html+(typeof css==='string'?'\n<style>'+css+'</style>':''),expected:null,kind:'html'});return '\n';}
   }
   return '\n```text\n'+tag+'\n```\n';
  }).replace(/<Mermaid\b[^>]*>([\s\S]*?)<\/Mermaid>/g,(_,diagram:string)=>'\n```mermaid\n'+diagram.replace(/^\s*\{`|`}\s*$/g,'').trim()+'\n```\n');
 }).join('');
 return {markdown,metadata,quizzes,checkpoints};
}
