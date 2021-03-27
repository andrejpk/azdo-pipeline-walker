import { writeFile } from "fs/promises";
import { PipelineFile } from "./analysis";


function cleanFilename(inp: string) {
    return inp.replace('${{','_').replace('}}','_')
}

export async function renderPipelineGraph(pipelineFiles: PipelineFile[], outputFilename: string) {
   const connections = pipelineFiles.map(plf => plf.templateLinks.map(tl => `${cleanFilename(tl.fromFilename)} --> ${cleanFilename(tl.toFilename)}`)).flat();
   const fileText = 'flowchart TB\n' + connections.join('\n') + '\n'
   await writeFile(outputFilename, fileText, 'utf8')
}