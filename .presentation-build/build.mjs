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
 {time:'0:00–0:12',text:'We’re Rick and Max. QAI helps professors see the reasoning behind an answer. In a calculus exercise, several students write forty-two. What went wrong?'},
 {time:'0:12–0:28',text:'The professor opens a question from their own material. Students scan a QR code and send a step or a photo. AI compares the work with the approved reference and gives private feedback.'},
 {time:'0:28–0:45',text:'The professor sees the mistakes behind the results. In a six-answer synthetic class, two students omitted the constant eight. An unsupported forty-two triggered a request for the missing step.'},
 {time:'0:45–1:00',text:'The professor chooses what to explain, then publishes a fresh check. Our next step is one real tutorial: measure whether the report changes teaching, and whether students transfer the idea.'},
];
function notes(slide,i,source){slide.speakerNotes.text=`${scripts[i].time}\n\n${scripts[i].text}\n\nSource: ${source}`;}
let s=p.slides.add();s.background.fill=C.dark;
text(s,'product-name','QAI',72,72,650,150,120,C.white,true);
text(s,'cover-message','The reasoning\nbehind the answer',78,266,730,180,60,C.white,true);
text(s,'team','Rick&Max',80,590,600,50,32,C.accent,true);
text(s,'answer-example','42',925,200,300,260,210,C.accent,true);
text(s,'answer-context','What went wrong?',908,482,320,50,28,C.white);
notes(s,0,'Restored ai-classroom-feedback-proposal.md; submission/pitch.md. The 42 example is a synthetic calculus response, not a measured classroom outcome.');

s=p.slides.add();s.background.fill=C.light;
text(s,'student-title','Students share their working',72,54,1136,85,54,C.ink,true);
text(s,'qr-entry','Scan the QR',76,227,650,65,36,C.ink,true);
text(s,'input-modes','A line of reasoning\nor a photo',76,332,650,120,36,C.ink);
text(s,'feedback','Private feedback',76,513,650,65,36,C.ink,true);
await picture(s,'existing-prototype.jpeg',836,142,250,539,'Student view of the QAI prototype, showing a synthetic calculus response.');
notes(s,1,'Merged demo/README.md; demo/web/teaching.js. Original prototype screenshot embedded in submission/QAI.pptx, ppt/media/image.jpeg. Screenshot uses synthetic example work.');

s=p.slides.add();s.background.fill=C.light;
text(s,'professor-title','Professors see what to explain',72,54,1136,85,52,C.ink,true);
text(s,'sample-count','2 of 6',74,224,340,95,70,C.ink,true);
text(s,'sample-explanation','synthetic responses\nomitted the constant',76,336,350,105,29,C.ink);
text(s,'uncertainty','“42” alone:\nask for the missing step',76,492,355,105,27,C.muted);
await picture(s,'professor-report.jpg',448,180,770,438,'Actual merged-app professor report displaying a six-response synthetic class and a proposed teaching intervention.');
notes(s,2,'submission/classroom-evaluation.md, simulated responses 3, 4 and 6; demo/web/sample-report.js, evidence counts and unclear response. Screenshot captured from isolated local demo, View example report. This is synthetic evidence and does not establish learning gains.');

s=p.slides.add();s.background.fill=C.dark;
text(s,'close-title','Feedback before the exam',72,83,1136,100,62,C.white,true);
text(s,'control','Professor approval stays central',76,253,1120,65,36,C.accent,true);
text(s,'pilot','Next: one real tutorial',76,364,1120,75,45,C.white,true);
text(s,'measurement','Measure teaching decisions\nand transfer to a fresh problem',76,462,1120,115,34,C.white);
text(s,'closing-team','Rick&Max',76,627,720,48,30,C.accent,true);
text(s,'closing-product','QAI',1090,615,120,60,46,C.white,true);
notes(s,3,'Restored ai-classroom-feedback-proposal.md: professor approval and transfer reassessment; submission/pitch.md: proposed tutorial pilot. These measures are a proposed next test, not demonstrated educational impact.');

await fs.mkdir(output,{recursive:true});
const words=scripts.flatMap(v=>v.text.split(/\s+/)).length;
console.log(`Speaker script: ${words} words. Four slides, 60 seconds.`);
await fs.writeFile(path.join(output,'60-second-script.md'),'# Rick&Max — QAI\n\nTarget duration: 60 seconds. '+words+' spoken words.\n\n'+scripts.map((v,i)=>`## Slide ${i+1} · ${v.time}\n\n${v.text}`).join('\n\n')+'\n');
const candidatePath=path.join(build,'candidate.pptx');
await (await PresentationFile.exportPptx(p)).save(candidatePath);
for (const [i,slide] of p.slides.items.entries()){
 const blob=await p.export({slide,format:'png',scale:1});
 await fs.writeFile(path.join(build,`slide-${i+1}.png`),new Uint8Array(await blob.arrayBuffer()));
}
const finalPath=path.join(output,'Rick-and-Max-QAI-60-seconds.pptx');
const result=await finalizePresentation({
 workspaceDir:root,candidatePath,finalPath,pythonExecutable:runtimePython,
 integrityValidatorPath:path.join(skill,'container_tools/inspect_presentation_package_integrity.py'),
 layoutValidatorPath:path.join(skill,'container_tools/inspect_presentation_layout_geometry.py'),
 layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-bullet-geometry','--validate-heading-fit'],
 explicitTotalSlideCount:4,requiredNativeTableOwnerSlides:[],requiredNativeChartOwnerSlides:[],
 fontPolicy:{basis:'design',families:[font]},verifyArtifactToolImport:true,
 receiptPath:path.join(build,'validation.json'),
});
console.log(JSON.stringify(result));
const pdf=await p.export({format:'pdf'});
await fs.writeFile(path.join(output,'Rick-and-Max-QAI-60-seconds.pdf'),new Uint8Array(await pdf.arrayBuffer()));
