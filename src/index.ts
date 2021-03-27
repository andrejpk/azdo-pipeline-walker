#!/usr/bin/env node

import {Command, flags} from '@oclif/command'
import { writeFile } from "fs/promises"
import { join } from 'path'
import { buildFileGraph } from "./analysis"
import { renderPipelineGraph } from "./rendering-mermaid"
import {handle} from '@oclif/errors'

class MapPipelineDeps extends Command {
    static flags = {
      version: flags.version(),
      help: flags.help(),
      // run with --dir= or -d=
      "base-dir": flags.string({
        char: 'd',
        default: process.cwd(),
        description: 'Root of the Azure Devops project; paths will be relative to this'
      }),
      "output-file": flags.string({
        char: 'o',
        default: join(process.cwd(),'graph.mmd'),
        description: 'Output Mermaid.js filename'
      }),
      "root-file": flags.string({
          char:'r',
          required: true,
          multiple: true
      })
    }
  
    async run() {
      const {flags} = this.parse(MapPipelineDeps)
      
        const root = flags['base-dir']
        const index = await buildFileGraph(flags['root-file'], root)
        console.dir(index)

        const fileList = Array.from(index.values())

        await renderPipelineGraph(fileList, flags['output-file'])
    }
  }
  
  MapPipelineDeps.run().then(null,handle)