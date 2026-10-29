// Run with the bundled artifact-tool dependency path in EVALUATION_ARTIFACT_MODULE.
// No network access, AI calls, or answer sheets in the input workbook.
import fs from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { pathToFileURL } from 'node:url'
const modulePath=process.env.EVALUATION_ARTIFACT_MODULE
if(!modulePath)throw new Error('Set EVALUATION_ARTIFACT_MODULE to the bundled @oai/artifact-tool entry; see manual guide.')
const {Workbook,SpreadsheetFile}=await import(pathToFileURL(modulePath).href)
const out='evaluations/fixtures'
await fs.mkdir(out,{recursive:true})
export const rows=[
  ['R01','2026-01','North',5,20],['R02','2026-01','South',10,20],
  ['R03','2026-01','North',10,15],['R04','2026-01','South',5,10],
  ['R05','2026-02','North',15,20],['R06','2026-02','South',6,20],
  ['R07','2026-02','North',4,20],['R08','2026-02','South',12,20],
  ['R09','2026-03','North',8,20],['R10','2026-03','South',10,20],
  ['R11','2026-03','North',5,20],['R12','2026-03','South',15,20],
]
const workbook=Workbook.create(),sheet=workbook.worksheets.add('Sales')
sheet.getRange('A1:E13').values=[['recordId','month','region','units','unitPrice'],...rows]
sheet.getRange('A1:E13').format.font.name='Arial'
sheet.getRange('A1:E13').format.font.size=11
sheet.getRange('A1:E1').format.fill='#263D5A'
sheet.getRange('A1:E1').format.font.color='#FFFFFF'
sheet.getRange('A1:E1').format.font.bold=true
sheet.getRange('A1:E13').format.columnWidth=16
sheet.getRange('A1:E13').format.rowHeight=24
sheet.getRange('D2:E13').numberFormat='0'
sheet.freezePanes.freezeRows(1)
await workbook.recalculate()
await (await SpreadsheetFile.exportXlsx(workbook)).save(`${out}/sales-v1.xlsx`)
await fs.mkdir('.qa/evaluation',{recursive:true})
await fs.rename(`${out}/sales-v1.xlsx.inspect.ndjson`,'.qa/evaluation/sales-inspect.ndjson').catch(e=>{if(e.code!=='ENOENT')throw e})
const preview=await workbook.render({sheetName:'Sales',range:'A1:E13',scale:1.5,format:'png'})
await fs.writeFile('.qa/evaluation/sales-preview.png',new Uint8Array(await preview.arrayBuffer()))
const bytes=await fs.readFile(`${out}/sales-v1.xlsx`)
await fs.writeFile(`${out}/sales-source.json`,JSON.stringify({provenance:'synthetic',rows},null,2)+'\n')
console.log(JSON.stringify({file:`${out}/sales-v1.xlsx`,sha256:createHash('sha256').update(bytes).digest('hex'),rows:rows.length}))
