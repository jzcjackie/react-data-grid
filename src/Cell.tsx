import { memo } from 'react';
import { css } from '@linaria/core';

import { useRovingTabIndex } from './hooks';
import { createCellEvent, getCellClassname, getCellStyle, isCellEditableUtil } from './utils';
import type { CellRendererProps } from './types';

const cellCopied = css`
  @layer rdg.Cell {
    background-color: #ccccff;
  }
`;

const cellCopiedClassname = `rdg-cell-copied ${cellCopied}`;

const cellDraggedOver = css`
  @layer rdg.Cell {
    background-color: #ccccff;

    &.${cellCopied} {
      background-color: #9999ff;
    }
  }
`;

const cellDraggedOverClassname = `rdg-cell-dragged-over ${cellDraggedOver}`;

function Cell<R, SR>({
  column,
  colSpan,
  isCellSelected,
  cellSelectRangeLeft,
  cellSelectRangeRight,
  cellSelectRangeTop,
  cellSelectRangeBottom,
  isCopied,
  isDraggedOver,
  row,
  rowIdx,
  onClick,
  onDoubleClick,
  onContextMenu,
  onRowChange,
  selectCell,
  rangeSelectionMode,
  ...props
}: CellRendererProps<R, SR>) {
  const { tabIndex, childTabIndex, onFocus } = useRovingTabIndex(isCellSelected);

  const { cellClass } = column;
  const className = getCellClassname(
    column,
    {
      [cellCopiedClassname]: isCopied,
      [cellDraggedOverClassname]: isDraggedOver
    },
    typeof cellClass === 'function' ? cellClass(row) : cellClass
  );
  const isEditable = isCellEditableUtil(column, row);

  function selectCellWrapper(openEditor?: boolean) {
    selectCell({ rowIdx, idx: column.idx }, openEditor);
  }

  function handleClick(event: React.MouseEvent<HTMLDivElement>) {
    if(!rangeSelectionMode){
      if (onClick) {
        const cellEvent = createCellEvent(event);
        onClick({ row, column, selectCell: selectCellWrapper }, cellEvent);
        if (cellEvent.isGridDefaultPrevented()) return;
      }
    }
    selectCellWrapper();
  }

  function handleContextMenu(event: React.MouseEvent<HTMLDivElement>) {
    if (onContextMenu) {
      const cellEvent = createCellEvent(event);
      onContextMenu({ row, column, selectCell: selectCellWrapper }, cellEvent);
      if (cellEvent.isGridDefaultPrevented()) return;
    }
    selectCellWrapper();
  }

  function handleDoubleClick(event: React.MouseEvent<HTMLDivElement>) {
    if (onDoubleClick) {
      const cellEvent = createCellEvent(event);
      onDoubleClick({ row, column, selectCell: selectCellWrapper }, cellEvent);
      if (cellEvent.isGridDefaultPrevented()) return;
    }
    selectCellWrapper(true);
  }

  function handleRowChange(newRow: R) {
    onRowChange(column, newRow);
  }

  function onMouseDown(event: React.MouseEvent<HTMLDivElement>){
    if(rangeSelectionMode){
      selectCellWrapper(false);
      const cellEvent = createCellEvent(event);
      onClick && onClick({row, column, selectCell: selectCellWrapper}, cellEvent);
      if (cellEvent.isGridDefaultPrevented()) return;
    }
  }

  return (
    <div
      role="gridcell"
      aria-colindex={column.idx + 1} // aria-colindex is 1-based
      aria-colspan={colSpan}
      aria-selected={isCellSelected}
      aria-selected-range-left={cellSelectRangeLeft}
      aria-selected-range-right={cellSelectRangeRight}
      aria-selected-range-top={cellSelectRangeTop}
      aria-selected-range-bottom={cellSelectRangeBottom}
      aria-readonly={!isEditable || undefined}
      tabIndex={tabIndex}
      className={className}
      style={getCellStyle(column, colSpan)}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      onMouseDown={onMouseDown}
      onFocus={onFocus}
      {...props}
    >
      {column.renderCell({
        column,
        row,
        rowIdx,
        isCellEditable: isEditable,
        tabIndex: childTabIndex,
        onRowChange: handleRowChange
      })}
    </div>
  );
}

export default memo(Cell) as <R, SR>(props: CellRendererProps<R, SR>) => JSX.Element;
