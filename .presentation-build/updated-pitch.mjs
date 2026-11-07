import fs from 'node:fs/promises';
import path from 'node:path';
import { Presentation, PresentationFile } from '@oai/artifact-tool';
import { finalizePresentation } from '/home/The_untextured/.codex/plugins/cache/openai-primary-runtime/presentations/26.1105.12137/skills/presentations/container_tools/artifact_tool_utils.mjs';

const root='/home/The_untextured/source/reply-hackathon';
const build=path.join(root,'.presentation-build');
const output=path.join(root,'submission/rick-max-pitch');
const skill='/home/The_untextured/.codex/plugins/cache/openai-primary-runtime/presentations/26.1105.12137/skills/presentations';
const runtimePython='/home/The_untextured/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3';
const p=Presentation.create({slideSize:{width:1280,height:720}});
const C={dark:'#142A35',light:'#F8FAF7',accent:'#7FD5C2',ink:'#14333B',muted:'#536C72',white:'#FFFFFF'};
const font='Noto Sans';
function text(slide,name,value,x,y,w,h,size,color,bold=false){
 const s=slide.shapes.add({geometry:'textbox',name,position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:'none',width:0}});
 s.text=value;
 s.text.style={typeface:font,fontSize:size,color,bold,insets:0,autoFit:'none',verticalAlignment:'top',alignment:'left',wrap:'square'};
 return s;
}
async function picture(slide,file,x,y,w,h,alt){
 const bytes=await fs.readFile(path.join(build,file));
 slide.images.add({blob:bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),contentType:file.endsWith('.png')?'image/png':'image/jpeg',alt,fit:file==='current-whiteboard.png'?'cover':'contain',...(file==='current-whiteboard.png'?{crop:{left:0.221,top:0.070,right:0.225,bottom:0.213}}:{}),position:{left:x,top:y,width:w,height:h}});
}
const scripts=[
 {time:'0:00–0:14',text:'Students watch someone fill a board. Professors cannot see where the class is stuck. Feedback arrives too late. For students like me with ADHD, passive classes are particularly hard to stay engaged in.'},
 {time:'0:14–0:34',text:'QAI makes practice interactive. Professors upload worksheets, images or Markdown. Students join by QR, then type, upload a photo or draw on the whiteboard. AI gives private, course-grounded feedback. Professors get misconception reports and follow-up questions. Students keep a personal practice history.'},
 {time:'0:34–0:46',text:'Here is the updated whiteboard: students sketch their working directly in the browser. They can undo, clear, add a note and submit their drawing.'},
 {time:'0:46–1:00',text:'Here, two of six synthetic responses missed the same term. The professor sees what needs explaining, with a worked example and a fresh check. Rick and Max: feedback that changes the next lesson.'},
];
const sources=[
 'ai-classroom-feedback-proposal.md and the project originator’s classroom experience. ADHD is a design motivation, not a clinically demonstrated benefit.',
 'README.md; demo/README.md; demo/web/teaching.js. Photo and whiteboard AI review require the live vision provider. Study history is retained on the student browser. Scores are formative feedback, not official grades.',
 'Fresh screenshot of the merged UI at /join in an isolated local rehearsal. Sample drawing entered for this presentation. Rehearsal stores drawings as unassessed; no AI image review was run for the screenshot.',
 'Fresh screenshot of /present, View example report. demo/web/sample-report.js; submission/classroom-evaluation.md. Six synthetic responses, two omitted constant 8. These results are demonstration data, not measured classroom impact.'
];
let s=p.slides.add();s.background.fill=C.dark;
text(s,'product-name','QAI',72,50,650,95,72,C.accent,true);
text(s,'cover-message','A full classroom.\nNo clear picture.',72,180,1136,185,76,C.white,true);
text(s,'professor-problem','Professors can’t see who is stuck or why.',76,408,1120,60,34,C.white);
text(s,'student-problem','Students watch. Copy. Lose focus.',76,491,1120,60,34,C.white);
text(s,'team','Rick&Max',76,623,600,48,30,C.accent,true);

s=p.slides.add();s.background.fill=C.light;
text(s,'feature-title','Main features',72,52,1136,85,58,C.ink,true);
const features=[
 ['Course material in','PDFs, images, text and Markdown',76,196],
 ['Join in seconds','QR access, no student account',672,196],
 ['Three ways to answer','Text + LaTeX, photo or whiteboard',76,351],
 ['Private AI feedback','Reasoning checked against course material',672,351],
 ['Teaching priorities','Misconceptions, examples and fresh checks',76,506],
 ['Personal progress','Practice history and participation points',672,506]
];
for(const [title,detail,x,y] of features){
 text(s,title+'-title',title,x,y,528,55,34,C.ink,true);
 text(s,title+'-detail',detail,x,y+62,528,85,27,C.muted);
}

s=p.slides.add();s.background.fill=C.light;
text(s,'whiteboard-title','Work it out on the whiteboard',72,54,1136,85,52,C.ink,true);
text(s,'whiteboard-draw','Draw directly\nin the browser',76,220,390,120,40,C.ink,true);
text(s,'whiteboard-tools','Undo. Clear.\nAdd a note. Submit.',76,391,390,105,31,C.ink);
text(s,'whiteboard-modes','Type or upload a photo, too.',76,565,390,85,26,C.muted);
await picture(s,'current-whiteboard.png',490,176,718,523,'Current QAI whiteboard submission UI with a sample sketch, captured from the merged app.');

s=p.slides.add();s.background.fill=C.light;
text(s,'professor-title','Know what to teach next',72,54,1136,85,54,C.ink,true);
text(s,'sample-count','2 of 6',74,211,340,95,70,C.ink,true);
text(s,'sample-explanation','synthetic responses\nmissed the same term',76,322,350,105,29,C.ink);
text(s,'intervention','A worked explanation.\nA fresh check.',76,473,350,100,29,C.ink,true);
text(s,'closing-brand','QAI · Rick&Max',76,632,500,50,29,C.ink,true);
await picture(s,'current-professor.png',448,180,770,435,'Current merged-app professor report: synthetic misconceptions, a worked teaching example, and a fresh check.');

await fs.mkdir(output,{recursive:true});
const words=scripts.flatMap(v=>v.text.split(/\s+/)).length;
console.log(`Speaker script: ${words} words. Four slides, 60 seconds.`);
await fs.writeFile(path.join(output,'QAI-Rick-Max-speaker-notes.md'),'# Rick&Max — QAI\n\nTarget duration: 60 seconds. '+words+' spoken words.\n\n'+scripts.map((v,i)=>`## Slide ${i+1} · ${v.time}\n\n${v.text}`).join('\n\n')+'\n\n## Source and demo notes (not spoken)\n\n'+sources.map((v,i)=>`- Slide ${i+1}: ${v}`).join('\n')+'\n');
const candidatePath=path.join(build,'updated-candidate.pptx');
await (await PresentationFile.exportPptx(p)).save(candidatePath);
for (const [i,slide] of p.slides.items.entries()){
 const blob=await p.export({slide,format:'png',scale:1});
 await fs.writeFile(path.join(build,`updated-slide-${i+1}.png`),new Uint8Array(await blob.arrayBuffer()));
}
const finalPath=path.join(output,'QAI-Rick-Max-final.pptx');
const result=await finalizePresentation({
 workspaceDir:root,candidatePath,finalPath,pythonExecutable:runtimePython,
 integrityValidatorPath:path.join(skill,'container_tools/inspect_presentation_package_integrity.py'),
 layoutValidatorPath:path.join(skill,'container_tools/inspect_presentation_layout_geometry.py'),
 layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-bullet-geometry','--validate-heading-fit'],
 explicitTotalSlideCount:4,requiredNativeTableOwnerSlides:[],requiredNativeChartOwnerSlides:[],
 fontPolicy:{basis:'design',families:[font]},verifyArtifactToolImport:true,
 receiptPath:path.join(build,'final-ui-validation.json'),
});
console.log(JSON.stringify(result));
