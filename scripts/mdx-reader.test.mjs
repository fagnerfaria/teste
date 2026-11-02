import assert from 'node:assert/strict';
import test from 'node:test';
import {parseExternalLesson} from '../src/lib/content/mdx-reader.ts';
test('reads MDX questions and checkpoints as data while preserving code fences',()=>{
 const raw='---\ntitle: Variáveis\n---\nTexto completo.\n\n```jsx\n<Quiz question="não executar" />\n```\n<Quiz question="Qual valor?" options={[{ text: "Dois", correct: true, explanation: "2 é o valor." }, {text: "Três", correct: false}]} />\n<Checkpoint challenge="Mostre dois" starterCode="console.log(2);" expected="2" />';
 const parsed=parseExternalLesson(raw);
 assert.equal(parsed.quizzes.length,1);
 assert.equal(parsed.quizzes[0].question,'Qual valor?');
 assert.deepEqual(parsed.quizzes[0].options.map(o=>o.text),['Dois','Três']);
 assert.equal(parsed.quizzes[0].options[0].correct,true);
 assert.equal(parsed.checkpoints[0].expected,'2');
 assert.match(parsed.markdown,/<Quiz question="não executar"/);
 assert.match(parsed.markdown,/Texto completo/);
 assert.doesNotMatch(parsed.markdown,/title: Variáveis/);
});
test('never evaluates expression attributes and retains unsupported widgets for inspection',()=>{
 const parsed=parseExternalLesson('<Quiz question={globalThis.fetch("https://evil")} options={doEvil()} />');
 assert.equal(parsed.quizzes.length,0);
 assert.match(parsed.markdown,/globalThis.fetch/);
});
test('handles braces inside quoted answers and static literal expression attributes',()=>{
 const parsed=parseExternalLesson('<Quiz question="Handler?" options={[{text:"onClick={handleClick}",correct:true},{text:"onClick={handleClick()}",correct:false}]} />\n<Checkpoint challenge="Conte" starterCode={`for(let i=1;i<4;i++){\\n console.log(i);\\n}`} expected={"1\\n2\\n3"} />');
 assert.equal(parsed.quizzes.length,1);
 assert.equal(parsed.quizzes[0].options[0].text,'onClick={handleClick}');
 assert.equal(parsed.checkpoints.length,1);
 assert.equal(parsed.checkpoints[0].expected,'1\n2\n3');
 assert.match(parsed.checkpoints[0].starterCode,/console.log/);
});
test('retains Mermaid diagrams, metadata and reflection checkpoints without executable MDX',()=>{
 const parsed=parseExternalLesson('---\ntitle: Exemplo\ncredits: Comunidade\n---\n<Mermaid chart={`flowchart TD\\n A-->B`} />\n<Checkpoint challenge="Explique o caminho" />');
 assert.match(parsed.metadata,/credits: Comunidade/);
 assert.match(parsed.markdown,/```mermaid/);
 assert.match(parsed.markdown,/A-->B/);
 assert.equal(parsed.checkpoints[0].kind,'reflection');
});
