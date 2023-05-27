import { CalculatedColumn, CellsRange } from "../types";
import { stringToArray } from "./stringUtils";


var lastPasteOperationTime: number = 0;
var navigatorApiFailed: boolean = false;

export function pasteFromClipboard(pasteDataToGrid: (data: any) => void, eDocument : Document, rootElement : HTMLDivElement| null): void {
    console.log('pasteFromClipboard');

    // Method 1 - native clipboard API, available in modern chrome browsers
    if (!navigatorApiFailed && navigator.clipboard && navigator.clipboard.readText) {
        console.log("paste from clipboard by navigator.clipboard")
        navigator.clipboard.readText()
            .then((data) => processClipboardData(data, pasteDataToGrid))
            .catch((e) => {
                navigatorApiFailed = true;
                pasteFromClipboardLegacy(pasteDataToGrid, eDocument, rootElement);
            });
    } else {
        pasteFromClipboardLegacy(pasteDataToGrid, eDocument, rootElement);
    }

}

function pasteFromClipboardLegacy(pasteDataToGrid: (data: any) => void, eDocument : Document, rootElement : HTMLDivElement| null): void {
    // Method 2 - if modern API fails, the old school hack
    let defaultPrevented = false;
    const handlePasteEvent = (e: ClipboardEvent) => {
        const currentPastOperationTime = (new Date()).getTime();
        if (currentPastOperationTime - lastPasteOperationTime < 50) {
            defaultPrevented = true;
            e.preventDefault();
        }
        lastPasteOperationTime = currentPastOperationTime;
    }

    executeOnTempElement(
        eDocument, rootElement,
        (textArea: HTMLTextAreaElement) => {
            textArea.addEventListener('paste', handlePasteEvent);
            textArea.focus({ preventScroll: true });

        },
        (element: HTMLTextAreaElement) => {
            console.log("paste by command")
            const data = element.value;
            if (!defaultPrevented) {
                processClipboardData(data, pasteDataToGrid);
            }
            element.removeEventListener('paste', handlePasteEvent);
        }
    );
}

function processClipboardData(data : any, pasteDataToGrid: (data: any) => void){
	if (data == null) { return; }
	let parsedData: string[][] | null = stringToArray(data);

	pasteDataToGrid(parsedData)
}

function executeOnTempElement(
    eDocument : Document, rootElement : HTMLDivElement | null,
    callbackNow: (element: HTMLTextAreaElement) => void,
    callbackAfter?: (element: HTMLTextAreaElement) => void,
): void {
    const eTempInput = eDocument.createElement('textarea');
    eTempInput.style.width = '1px';
    eTempInput.style.height = '1px';

    // removing items from the DOM causes the document element to scroll to the
    // position where the element was positioned. Here we set scrollTop / scrollLeft
    // to prevent the document element from scrolling when we remove it from the DOM.
    eTempInput.style.top = eDocument.documentElement.scrollTop + 'px';
    eTempInput.style.left = eDocument.documentElement.scrollLeft + 'px';

    eTempInput.style.position = 'absolute';
    eTempInput.style.opacity = '0';

    rootElement?.appendChild(eTempInput);

    try {
        callbackNow(eTempInput);
    } catch (err) {
        console.warn('AG Grid: Browser does not support document.execCommand(\'copy\') for clipboard operations');
    }

    //It needs 100 otherwise OS X seemed to not always be able to paste... Go figure...
    if (callbackAfter) {
        window.setTimeout(() => {
            callbackAfter(eTempInput);
            rootElement?.removeChild(eTempInput);
        }, 100);
    } else {
        rootElement?.removeChild(eTempInput);
    }
}

export function copyDataToClipboard(data: string, document : Document, rootElement : HTMLDivElement| null): void {

    // method 1 - native clipboard API, available in modern chrome browsers
    if (navigator.clipboard) {
        console.log("copy to calipboard by navigator.clipboard")
        navigator.clipboard.writeText(data).catch((e) => {
            navigatorApiFailed = true;
            copyDataToClipboardLegacy(data, document, rootElement);
        });
        return;
    }

    copyDataToClipboardLegacy(data, document, rootElement);
}

function copyDataToClipboardLegacy(data: string, document : Document, rootElement : HTMLDivElement| null): void {

    console.log("copy to calipboard by eDocument.execCommand")
    // method 2 - if all else fails, the old school hack
    executeOnTempElement(
        document, rootElement, 
        element => {
            const focusedElementBefore = document.activeElement as HTMLElement;

            element.value = data || ' '; // has to be non-empty value or execCommand will not do anything
            element.select();
            element.focus({ preventScroll: true });

            const result = document.execCommand('copy');

            if (!result) {
                console.warn('');
            }

            if (focusedElementBefore != null && focusedElementBefore.focus != null) {
                focusedElementBefore.focus({ preventScroll: true });
            }
        }
    );
}


export function pasteDataFromFocusedCell<R, SR>(selectedPosition: any , rawRows : readonly R[], columns : readonly CalculatedColumn<R, SR>[], pasteData:string[][], getRawRowIdx : (rowIdx: number) => number) : void{

    const { idx, rowIdx } = selectedPosition;
      pasteData.forEach(function(dataRow, row) {
        if(row + rowIdx > rawRows.length){
          return
        }

        const targetRow = rawRows[getRawRowIdx(row + rowIdx)] as any;

        dataRow.forEach(function(dataCol, col){
          if(col + idx > columns.length){
            return
          }
          const targetColumn = columns[idx + col];
          if(!targetColumn.editable && !targetColumn.editor){
            // 非编辑列不可粘贴
            return
        }

          targetRow[targetColumn.key] = dataCol;
        })

      })
}

export function pasteDataIntoSelectRange<R, SR>(cellRange: CellsRange, rawRows : readonly R[], columns : readonly CalculatedColumn<R, SR>[], pasteData:string[][]) : void{
    let dataRowIdx = 0;
    for(let rowIdx = cellRange.startRowIdx; rowIdx <= cellRange.endRowIdx; rowIdx++, dataRowIdx++){
        let targetRow = rawRows[rowIdx] as any
        if(pasteData.length <= dataRowIdx){
            dataRowIdx = 0
        }

        let pasteRowData = pasteData[dataRowIdx]
        let dataColIdx = 0;
        for(let colIdx = cellRange.startColumnIdx; colIdx <= cellRange.endColumnIdx; colIdx++, dataColIdx++){
            if(pasteRowData.length <= dataColIdx ){
                dataColIdx = 0;
            }
            const targetColumn = columns[colIdx];
            if(!targetColumn.editable && !targetColumn.editor){
                // 非编辑列不可粘贴
                return
            }

            targetRow[targetColumn.key] = pasteRowData[dataColIdx];
        }
    }
}