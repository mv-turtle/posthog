import { ActionNode, EventsNode, EventsTableNode, LegacyQuery, Node, NodeKind, SavedInsightNode } from '~/queries/nodes'

export function isDataNode(node?: Node): node is EventsNode | ActionNode {
    return isEventsNode(node) || isActionNode(node)
}

export function isEventsNode(node?: Node): node is EventsNode {
    return node?.kind === NodeKind.EventsNode
}

export function isEventsTableNode(node?: Node): node is EventsTableNode {
    return node?.kind === NodeKind.EventsTableNode
}

export function isActionNode(node?: Node): node is ActionNode {
    return node?.kind === NodeKind.ActionNode
}

export function isLegacyQuery(node?: Node): node is LegacyQuery {
    return node?.kind === NodeKind.LegacyQuery
}

export function isSavedInsightNode(node?: Node): node is SavedInsightNode {
    return node?.kind === NodeKind.SavedInsightNode
}
