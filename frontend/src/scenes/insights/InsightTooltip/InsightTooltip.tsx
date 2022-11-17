import './InsightTooltip.scss'
import { ReactNode } from 'react'
import { LemonTable, LemonTableColumn, LemonTableColumns } from 'lib/components/LemonTable'
import {
    COL_CUTOFF,
    ROW_CUTOFF,
    getTooltipTitle,
    InsightTooltipProps,
    invertDataSource,
    InvertedSeriesDatum,
    SeriesDatum,
    getFormattedDate,
} from './insightTooltipUtils'
import { InsightLabel } from 'lib/components/InsightLabel'
import { SeriesLetter } from 'lib/components/SeriesGlyph'
import { IconHandClick } from 'lib/components/icons'
import { shortTimeZone } from 'lib/utils'
import { humanFriendlyNumber } from 'lib/utils'
import { useValues } from 'kea'
import { FormatPropertyValueForDisplayFunction, propertyDefinitionsModel } from '~/models/propertyDefinitionsModel'
import { formatAggregationValue } from 'scenes/insights/utils'

export function ClickToInspectActors({
    isTruncated,
    groupTypeLabel,
}: {
    isTruncated?: boolean
    groupTypeLabel: string
}): JSX.Element {
    return (
        <div className="table-subtext">
            {isTruncated && (
                <div className="table-subtext-truncated">
                    For readability, <b>not all series are displayed</b>.<br />
                </div>
            )}
            <div className="table-subtext-click-to-inspect">
                <IconHandClick style={{ marginRight: 4, marginBottom: 2 }} />
                Click to view {groupTypeLabel}
            </div>
        </div>
    )
}

function renderDatumToTableCell(
    datumMathProperty: string | undefined,
    datumValue: number | undefined,
    formatPropertyValueForDisplay: FormatPropertyValueForDisplayFunction,
    renderCount: (value: number) => React.ReactNode,
    /** Optional hexadecimal color string.
     * Usually the color is shown on the datum row level, but in case of breakdowns where there are multiple columns,
     * we need to show the color separately for each cell.
     */
    color?: string
): JSX.Element {
    // Value can be undefined if the datum's series doesn't have ANY value for the breakdown value being rendered
    return (
        <div className="series-data-cell">
            {
                color && (
                    <span className="mr-2" style={{ color }}>
                        ●
                    </span>
                ) /* eslint-disable-line react/forbid-dom-props */
            }
            {datumValue !== undefined
                ? formatAggregationValue(datumMathProperty, datumValue, renderCount, formatPropertyValueForDisplay)
                : '–'}
        </div>
    )
}

export function InsightTooltip({
    date,
    timezone = 'UTC',
    seriesData = [],
    altTitle,
    altRightTitle,
    renderSeries = (value: React.ReactNode, datum: SeriesDatum) => {
        const hasBreakdown = datum.breakdown_value !== undefined && !!datum.breakdown_value
        return (
            <div className="datum-label-column">
                <SeriesLetter
                    className="mr-2"
                    hasBreakdown={hasBreakdown}
                    seriesIndex={datum?.action?.order ?? datum.id}
                />
                {value}
            </div>
        )
    },
    renderCount = (value: number) => {
        return <>{humanFriendlyNumber(value)}</>
    },
    hideColorCol = false,
    hideInspectActorsSection = false,
    forceEntitiesAsColumns = false,
    rowCutoff = ROW_CUTOFF,
    colCutoff = COL_CUTOFF,
    showHeader = true,
    groupTypeLabel = 'people',
}: InsightTooltipProps): JSX.Element {
    // If multiple entities exist (i.e., pageview + autocapture) and there is a breakdown/compare/multi-group happening, itemize entities as columns to save vertical space..
    // If only a single entity exists, itemize entity counts as rows.
    // Throw these rules out the window if `forceEntitiesAsColumns` is true
    const itemizeEntitiesAsColumns =
        forceEntitiesAsColumns ||
        ((seriesData?.length ?? 0) > 1 &&
            (seriesData?.[0]?.breakdown_value !== undefined || seriesData?.[0]?.compare_label !== undefined))

    const { formatPropertyValueForDisplay } = useValues(propertyDefinitionsModel)

    const title: ReactNode | null =
        getTooltipTitle(seriesData, altTitle, date) ||
        `${getFormattedDate(date, seriesData?.[0]?.filter?.interval)} (${timezone ? shortTimeZone(timezone) : 'UTC'})`
    const rightTitle: ReactNode | null = getTooltipTitle(seriesData, altRightTitle, date) || null

    if (itemizeEntitiesAsColumns) {
        hideColorCol = true
        const dataSource = invertDataSource(seriesData)
        const columns: LemonTableColumns<InvertedSeriesDatum> = [
            {
                key: 'datum',
                className: 'datum-column',
                title,
                sticky: true,
                render: function renderDatum(_, datum) {
                    return <div>{datum.datumTitle}</div>
                },
            },
        ]
        const numDataPoints = Math.max(...dataSource.map((ds) => ds?.seriesData?.length ?? 0))
        const isTruncated = numDataPoints > colCutoff || dataSource.length > rowCutoff

        if (numDataPoints > 0) {
            const indexOfLongestSeries = dataSource.findIndex((ds) => ds?.seriesData?.length === numDataPoints)
            const truncatedCols = dataSource?.[indexOfLongestSeries !== -1 ? indexOfLongestSeries : 0].seriesData.slice(
                0,
                colCutoff
            )
            const dataColumns: LemonTableColumn<InvertedSeriesDatum, keyof InvertedSeriesDatum | undefined>[] = []
            truncatedCols.forEach((seriesColumn, colIdx) => {
                dataColumns.push({
                    key: colIdx.toString(),
                    className: 'datum-counts-column',
                    align: 'right',
                    title:
                        (colIdx === 0 ? rightTitle : undefined) ||
                        (!altTitle &&
                            renderSeries(
                                <InsightLabel
                                    action={seriesColumn.action}
                                    fallbackName={seriesColumn.label}
                                    hideBreakdown
                                    showSingleName
                                    hideCompare
                                    hideIcon
                                    allowWrap
                                />,
                                seriesColumn,
                                colIdx
                            )),
                    render: function renderSeriesColumnData(_, datum) {
                        const seriesColumnData = datum.seriesData?.[colIdx]
                        return renderDatumToTableCell(
                            seriesColumnData?.action?.math_property,
                            seriesColumnData?.count,
                            formatPropertyValueForDisplay,
                            renderCount,
                            seriesColumnData.color
                        )
                    },
                })
            })
            dataColumns.sort(
                (a, b) =>
                    (truncatedCols[parseInt(a.key as string)]?.action?.order || 0) -
                    (truncatedCols[parseInt(b.key as string)]?.action?.order || 0)
            )
            columns.push(...dataColumns)
        }

        return (
            <div className="InsightTooltip">
                <LemonTable
                    dataSource={dataSource.slice(0, rowCutoff)}
                    columns={columns}
                    rowKey="id"
                    size="small"
                    uppercaseHeader={false}
                    rowRibbonColor={hideColorCol ? undefined : (datum) => datum.color || null}
                    showHeader={showHeader}
                />
                {!hideInspectActorsSection && (
                    <ClickToInspectActors isTruncated={isTruncated} groupTypeLabel={groupTypeLabel} />
                )}
            </div>
        )
    }

    // Itemize tooltip entities as rows
    const dataSource = [...seriesData]
    const columns: LemonTableColumn<SeriesDatum, keyof SeriesDatum | undefined>[] = []
    const isTruncated = dataSource?.length > rowCutoff

    columns.push({
        key: 'datum',
        width: 120,
        title: <span className="whitespace-nowrap">{title}</span>,
        sticky: true,
        render: function renderDatum(_, datum, rowIdx) {
            return renderSeries(
                <InsightLabel
                    action={datum.action}
                    fallbackName={datum.label}
                    hideBreakdown
                    showSingleName
                    hideCompare
                    hideIcon
                    allowWrap
                />,
                datum,
                rowIdx
            )
        },
    })

    columns.push({
        key: 'counts',
        className: 'datum-counts-column',
        width: 50,
        title: <span className="whitespace-nowrap">{rightTitle ?? undefined}</span>,
        align: 'right',
        render: function renderDatum(_, datum) {
            return renderDatumToTableCell(
                datum.action?.math_property,
                datum.count,
                formatPropertyValueForDisplay,
                renderCount
            )
        },
    })

    return (
        <div className="InsightTooltip">
            <LemonTable
                dataSource={dataSource.slice(0, rowCutoff)}
                columns={columns}
                rowKey="id"
                size="small"
                className="ph-no-capture"
                uppercaseHeader={false}
                rowRibbonColor={hideColorCol ? undefined : (datum: SeriesDatum) => datum.color || null}
                showHeader={showHeader}
            />
            {!hideInspectActorsSection && (
                <ClickToInspectActors isTruncated={isTruncated} groupTypeLabel={groupTypeLabel} />
            )}
        </div>
    )
}
