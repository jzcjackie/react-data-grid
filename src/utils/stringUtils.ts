import { Column, CellsRange } from "../types";

// This will parse a delimited string into an array of arrays.
export function stringToArray(strData: string, delimiter = '\t'): string[][] {
    const data: any[][] = [];
    const isNewline = (char: string) => char === '\r' || char === '\n';

    let insideQuotedField = false;

    if (strData === '') { return [['']]; }

    // iterate over each character, keep track of current row and column (of the returned array)
    for (let row = 0, column = 0, position = 0; position < strData.length; position++) {
        const previousChar = strData[position - 1];
        const currentChar = strData[position];
        const nextChar = strData[position + 1];
        const ensureDataExists = () => {
            if (!data[row]) {
                // create row if it doesn't exist
                data[row] = [];
            }

            if (!data[row][column]) {
                // create column if it doesn't exist
                data[row][column] = '';
            }
        };

        ensureDataExists();

        if (currentChar === '"') {
            if (insideQuotedField) {
                if (nextChar === '"') {
                    // unescape double quote
                    data[row][column] += '"';
                    position++;
                } else {
                    // exit quoted field
                    insideQuotedField = false;
                }

                continue;
            } else if (previousChar === undefined || previousChar === delimiter || isNewline(previousChar)) {
                // enter quoted field
                insideQuotedField = true;
                continue;
            }
        }

        if (!insideQuotedField) {
            if (currentChar === delimiter) {
                // move to next column
                column++;
                ensureDataExists();

                continue;
            } else if (isNewline(currentChar)) {
                // move to next row
                column = 0;
                row++;
                ensureDataExists();

                if (currentChar === '\r' && nextChar === '\n') {
                    // skip over second newline character if it exists
                    position++;
                }

                continue;
            }
        }

        // add current character to current column
        data[row][column] += currentChar;
    }

    return data;
}


export function getDataAsCsv<R, SR>(cellRange: CellsRange, columns : readonly Column<R, SR>[], rawRows : readonly R[], delimiter = '\t'): string{

    let csvValue = ""

    for(let rowIdx = cellRange.startRowIdx; rowIdx <= cellRange.endRowIdx; rowIdx++){
        let row = rawRows[rowIdx] as any
        for(let colIdx = cellRange.startColumnIdx; colIdx <= cellRange.endColumnIdx; colIdx++){
            let column = columns[colIdx]
            csvValue += column && column.valueGetter != null ? column.valueGetter(row[column.key as R]) : row[column.key]
            if(colIdx != cellRange.endColumnIdx){
                csvValue += delimiter
            }
        }
        if(rowIdx != cellRange.endRowIdx){
            csvValue += '\r'
        }
    }

    return csvValue
}