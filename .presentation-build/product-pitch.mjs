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
 slide.images.add({blob:bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),contentType:'image/jpeg',alt,fit:'contain',position:{left:x,top:y,width:w,height:h}});
}
const scripts=[
 {time:'0:00–0:16',text:'A professor fills the board. Students copy. But who is lost, and why? The professor cannot read hundreds of answers. Students wait for feedback, and passive classes make attention difficult, especially for those of us with ADHD.'},
 {time:'0:16–0:30',text:'QAI turns that class into active practice. Students scan a QR code, explain their reasoning or upload a photo, and get immediate, private feedback grounded in course material.'},
 {time:'0:30–0:47',text:'Professors see what to teach next. In this synthetic example, two of six answers missed the same term. QAI surfaces the misconception and suggests an explanation and a fresh question, with the professor in control.'},
 {time:'0:47–1:00',text:'Students practise instead of just watching. Professors teach to the gaps they can now see. We’re Rick and Max. QAI makes every answer a chance to improve the next lesson.'},
];
function notes(slide,i,source){slide.speakerNotes.text=`${scripts[i].time}\n\n${scripts[i].text}\n\nSource: ${source}`;}
let s=p.slides.add();s.background.fill=C.dark;
text(s,'product-name','QAI',72,50,650,95,72,C.accent,true);
text(s,'cover-message','A full classroom.\nNo clear picture.',72,180,1136,185,76,C.white,true);
text(s,'professor-problem','Professors can’t see who is stuck or why.',76,408,1120,60,34,C.white);
text(s,'student-problem','Students watch. Copy. Lose focus.',76,491,1120,60,34,C.white);
text(s,'team','Rick&Max',76,623,600,48,30,C.accent,true);
notes(s,0,'ai-classroom-feedback-proposal.md, Problems Addressed and Motivation; user’s classroom experience. ADHD is a design motivation based on the originator’s experience, not a claim of clinically demonstrated benefit. Classroom problem framing is the product hypothesis, not a quantified prevalence claim.');

s=p.slides.add();s.background.fill=C.light;
text(s,'student-title','From watching to working',72,54,1136,85,54,C.ink,true);
text(s,'qr-entry','One QR code. Everyone can answer.',76,224,680,110,36,C.ink,true);
text(s,'input-modes','Explain a step. Upload a photo.',76,366,680,100,34,C.ink);
text(s,'feedback','Get feedback while it still matters.',76,514,680,110,36,C.ink,true);
await picture(s,'existing-prototype.jpeg',836,142,250,539,'Student view of the QAI prototype, showing a synthetic calculus response.');
notes(s,1,'ai-classroom-feedback-proposal.md, Core Workflow; README.md and demo/web/teaching.js. Original prototype screenshot embedded in submission/QAI.pptx, ppt/media/image.jpeg. Screenshot uses synthetic example work. AI feedback is formative and grounded in professor-approved material; no demonstrated learning or ADHD benefit is claimed.');

s=p.slides.add();s.background.fill=C.light;
text(s,'professor-title','Know what to teach next',72,54,1136,85,54,C.ink,true);
text(s,'sample-count','2 of 6',74,224,340,95,70,C.ink,true);
text(s,'sample-explanation','synthetic responses\nmissed the same term',76,336,350,105,29,C.ink);
text(s,'intervention','See the gap.\nChoose the next explanation.',76,490,350,115,28,C.muted);
await picture(s,'professor-report.jpg',448,180,770,438,'Actual merged-app professor report displaying a six-response synthetic class and a proposed teaching intervention.');
notes(s,2,'submission/classroom-evaluation.md, simulated responses 3 and 4; demo/web/sample-report.js. Two of six synthetic responses omitted the constant 8. Screenshot captured from isolated local demo, View example report. Proposed intervention and transfer question are shown in the screenshot. Professor reviews the teaching action. No measured learning gains are claimed.');

s=p.slides.add();s.background.fill=C.dark;
text(s,'close-title','Every answer shapes\nthe next lesson.',72,82,1136,185,68,C.white,true);
text(s,'student-value','Students practise instead of just watching.',76,345,1120,65,36,C.white);
text(s,'professor-value','Professors teach to the gaps they can see.',76,438,1120,65,36,C.white);
text(s,'value','Feedback before the exam.',76,542,1120,65,38,C.accent,true);
text(s,'closing-team','Rick&Max',76,637,720,48,28,C.accent,true);
text(s,'closing-product','QAI',1090,625,120,60,44,C.white,true);
notes(s,3,'ai-classroom-feedback-proposal.md, Concept, Why AI and an Application Are Needed, and Validation and Limits. This is the product value proposition. The prototype demonstrates a feedback-to-teaching workflow; classroom impact remains to be evaluated in a real tutorial.');

await fs.mkdir(output,{recursive:true});
const words=scripts.flatMap(v=>v.text.split(/\s+/)).length;
console.log(`Speaker script: ${words} words. Four slides, 60 seconds.`);
await fs.writeFile(path.join(output,'product-pitch-script.md'),'# Rick&Max — QAI\n\nTarget duration: 60 seconds. '+words+' spoken words.\n\n'+scripts.map((v,i)=>`## Slide ${i+1} · ${v.time}\n\n${v.text}`).join('\n\n')+'\n');
const candidatePath=path.join(build,'product-candidate.pptx');
await (await PresentationFile.exportPptx(p)).save(candidatePath);
for (const [i,slide] of p.slides.items.entries()){
 const blob=await p.export({slide,format:'png',scale:1});
 await fs.writeFile(path.join(build,`product-slide-${i+1}.png`),new Uint8Array(await blob.arrayBuffer()));
}
const finalPath=path.join(output,'Rick-and-Max-QAI-product-pitch.pptx');
const result=await finalizePresentation({
 workspaceDir:root,candidatePath,finalPath,pythonExecutable:runtimePython,
 integrityValidatorPath:path.join(skill,'container_tools/inspect_presentation_package_integrity.py'),
 layoutValidatorPath:path.join(skill,'container_tools/inspect_presentation_layout_geometry.py'),
 layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-bullet-geometry','--validate-heading-fit'],
 explicitTotalSlideCount:4,requiredNativeTableOwnerSlides:[],requiredNativeChartOwnerSlides:[],
 fontPolicy:{basis:'design',families:[font]},verifyArtifactToolImport:true,
 receiptPath:path.join(build,'product-validation.json'),
});
console.log(JSON.stringify(result));
