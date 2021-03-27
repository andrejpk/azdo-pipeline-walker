import cytoscape from 'cytoscape';

import { PipelineFile } from './analysis';


export async function renderPipelineGraph(pipelineFiles: PipelineFile[], outputFilename: string) {
const cy = cytoscape({
    headless: true,
    elements: (pipelineFiles.map(f => 
        [
            {
                data: {
                        id: f.relativePath
                    }
                },
                ...f.templateLinks.map(tl => ({
                    data: {
                        id: tl.fromFilename + '->' + tl.toFilename,
                        source: tl.fromFilename,
                        target: tl.toFilename
                    }
                }))
        ]).flat()
    )})
}
