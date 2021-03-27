
import {join, dirname, relative, } from 'path'
import {readFile} from 'fs/promises'
import * as yaml from 'js-yaml'

type ValueOrDict<T> = T | Record<string,T>

type YamlValue = ValueOrDict<string |  null | Array<YamlValue>>
type YamlObject = Record<string,YamlValue>

export interface PipelineFile {
    relativePath: string
    templateLinks: Array<TemplateLink>
}

export interface TemplateLink {
    fromFile?: PipelineFile
    fromFilename: string
    toFile?: PipelineFile
    toFilename: string
    yamlPath: string
}

// filename is relative to rootPath
async function parseFile(rootPath: string, filename: string) {
    const fullPath = join(rootPath, filename)
    const thisPipelineFile: PipelineFile = {
        relativePath: filename,
        templateLinks: []
    }
    console.log(`Reading ${filename}`)
    let docText
    try {
        docText = await readFile(fullPath, 'utf8');
    }
    catch (e) {
        console.warn(`Error ${e} trying to open file ${fullPath}`)
        return thisPipelineFile
    }
    const doc = yaml.load(docText);
    const thisFileDir = dirname(fullPath)

    function addTemplateRef(relativePath: string, yamlPath: string) {
        const linkedFileFullPath = join(thisFileDir, relativePath)
        const linkedFileRootRelative = relative(rootPath, linkedFileFullPath)
        console.debug(`Found link to template ${linkedFileRootRelative} in ${yamlPath}`)
        const newLink: TemplateLink = {
            fromFilename: filename,
            toFilename: linkedFileRootRelative,
            yamlPath
        }
        thisPipelineFile.templateLinks.push(newLink)
    }

    function walkObject(obj: Record<string,YamlValue>, yamlPath: string) {
        for(const key in obj) {
            console.debug(`Checking ${yamlPath} / ${key}`)
            const val = obj[key]
            if (key === 'template' && typeof val === 'string') {
                addTemplateRef(val, yamlPath)
            }
            const curKeyPath = yamlPath + '.' + key
            if (val === null) break;
            if(Array.isArray(val)) {
                walkArray(val, curKeyPath)
                continue;  
            }   
            if(typeof val === 'object') {
                val 
                walkObject(val as Record<string, YamlValue>, curKeyPath)
            }
        }
    }

    function walkArray(arr: Array<YamlValue>, yamlPath: string) {
        for(const index in arr) {
            const val = arr[index]
            const curKeyPath = `${yamlPath}[${index}]`
            if (val === null) break;
            if (Array.isArray(val)) {
                walkArray(val, curKeyPath)
                continue;
            }
            if (typeof val === 'object') {
                walkObject(val, curKeyPath)
            }
        }
    }

    walkObject(doc as YamlObject, "")

    return thisPipelineFile
}

type PipelineFileIndex = Map<string, PipelineFile>

export async function buildFileGraph(startFiles: string[], rootPath: string, index?: PipelineFileIndex): Promise<PipelineFileIndex> {
   const toIndex = [...startFiles]
   const pipelineIndex: PipelineFileIndex = index ?? new Map()
   // walk the trees until we have visited all of them
   while (toIndex.length) {
       const thisFile = toIndex.pop()
       if (!thisFile) break;
       console.debug(`Processing file ${thisFile}`)
       const r = await parseFile(rootPath, thisFile)
       pipelineIndex.set(thisFile, r)
       for(const tl of r.templateLinks) {
           const {toFilename} = tl
           if (pipelineIndex.has(toFilename)) {
               tl.toFile = pipelineIndex.get(toFilename)
           }
           else {
               toIndex.push(toFilename)
           }
       }
   }
   // clean up reference maps now that we have all files in our index
   for(const filename in pipelineIndex) {
       const file = pipelineIndex.get(filename)
       if (!file) throw Error("indexing error; this can't happen")
       file.templateLinks = file.templateLinks.map(tl => ({...tl,toFile: pipelineIndex.get(tl.toFilename) }))
   }
   return pipelineIndex
}