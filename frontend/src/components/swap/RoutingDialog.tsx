import { CSSProperties, useEffect, useMemo, useState } from "react";

import BigNumber from "bignumber.js";
import ELK, {
  LayoutOptions as ElkLayoutOptions,
} from "elkjs/lib/elk.bundled.js";
import { Route } from "lucide-react";
import ReactFlow, {
  BaseEdge,
  Edge,
  EdgeLabelRenderer,
  EdgeProps,
  EdgeTypes,
  Handle,
  HandleProps,
  Node,
  NodeTypes,
  Position,
  getBezierPath,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from "reactflow";

import {
  QUOTE_PROVIDER_NAME_MAP,
  StandardizedPathWithToken,
  StandardizedQuote,
  StandardizedRoutePath,
} from "@suilend/sdk";
import { Token, formatPercent, formatToken, getToken } from "@suilend/sui-fe";
import { useSettingsContext } from "@suilend/sui-fe-next";
import useCoinMetadataMap from "@suilend/sui-fe-next/hooks/useCoinMetadataMap";

import Button from "@/components/shared/Button";
import Dialog from "@/components/shared/Dialog";
import FromToArrow from "@/components/shared/FromToArrow";
import TextLink from "@/components/shared/TextLink";
import TokenLogo from "@/components/shared/TokenLogo";
import TokenLogos from "@/components/shared/TokenLogos";
import Tooltip from "@/components/shared/Tooltip";
import { TBody, TBodySans, TLabelSans } from "@/components/shared/Typography";
import { useSwapContext } from "@/contexts/SwapContext";
import { cn, hoverUnderlineClassName } from "@/lib/utils";
import "reactflow/dist/style.css";

const elk = new ELK();
const getLayoutedElements = async (
  nodes: Node[],
  edges: Edge[],
  options: ElkLayoutOptions,
) => {
  const layoutedGraph = await elk.layout({
    id: "root",
    layoutOptions: options,
    children: (nodes as any[]).map((node) => ({
      ...node,
      targetPosition: "left",
      sourcePosition: "right",
    })),
    edges: edges as any[],
  });

  return {
    nodes: (layoutedGraph?.children ?? []).map((node) => ({
      ...node,
      // React Flow expects a position property on the node instead of `x`
      // and `y` fields.
      position: { x: node.x, y: node.y },
    })),
    edges: layoutedGraph.edges ?? [],
  };
};

function CustomHandle(props: HandleProps) {
  return (
    <Handle
      className={cn(
        "!h-1 !min-h-px !w-1 !min-w-px !border-0 !bg-foreground",
        props.position === Position.Left && "!-left-[2px]",
        props.position === Position.Right && "!-right-[2px]",
      )}
      {...props}
    />
  );
}

function CustomEdge(props: EdgeProps) {
  const {
    id,
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    label,
  } = props;

  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        style={{ stroke: "hsla(var(--foreground) / 50%)" }}
      />
      {label && (
        <EdgeLabelRenderer>
          <TLabelSans
            className="absolute -translate-x-1/2 -translate-y-1/2 bg-popover px-1 text-foreground/50"
            style={{ left: labelX, top: labelY }}
          >
            {label}
          </TLabelSans>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

// StartEndNode
type StartEndNodeData = {
  isStart?: boolean;
  token: Token;
  amount: BigNumber;
};

const getStartEndNodeWidth = (data: StartEndNodeData) =>
  Math.ceil(
    (2.5 +
      4 +
      1.5 +
      (8.4 / 4) *
        `${formatToken(data.amount, { exact: false })} ${data.token.symbol}`
          .length +
      2.5) *
      4,
  ); // px
const START_END_NODE_HEIGHT = (2 + 5 + 2) * 4; // px

interface StartEndNodeProps {
  data: StartEndNodeData;
}

function StartEndNode({ data }: StartEndNodeProps) {
  const { isStart, token, amount } = data;

  return (
    <>
      {!isStart && <CustomHandle type="target" position={Position.Left} />}

      <div className="flex flex-row items-center gap-1.5 rounded-md bg-border px-2.5 py-2">
        <TokenLogo
          className="h-4 w-4"
          imageProps={{ className: "rounded-full" }}
          token={token}
        />

        <TBody>
          <Tooltip title={formatToken(amount, { dp: token.decimals })}>
            <span
              className={cn(
                "decoration-foreground/50",
                hoverUnderlineClassName,
              )}
            >
              {formatToken(amount, { exact: false })}
            </span>
          </Tooltip>{" "}
          {token.symbol}
        </TBody>
      </div>
      {isStart && <CustomHandle type="source" position={Position.Right} />}
    </>
  );
}

// ExchangeNode
type ExchangeNodeData = StandardizedPathWithToken;

const getExchangeNodeWidth = (data: ExchangeNodeData) =>
  Math.ceil(
    (2.5 + 30 / 4 + 1.5 + (8.4 / 4) * data.provider.length + 1 + 4 + 2.5) * 4,
  ); // px
const EXCHANGE_NODE_HEIGHT = (2 + 5 + 2) * 4; // px

interface ExchangeNodeProps {
  data: ExchangeNodeData;
}

function ExchangeNode({ data }: ExchangeNodeProps) {
  const { explorer } = useSettingsContext();

  return (
    <>
      <CustomHandle type="target" position={Position.Left} />
      <div
        className="flex flex-row items-center justify-center gap-1.5 rounded-md bg-border px-2.5 py-2"
        style={{ "--bg-color": "hsl(var(--border))" } as CSSProperties}
      >
        <Tooltip
          contentProps={{ style: { maxWidth: "none" } }}
          content={
            <TBodySans className="text-xs">
              {formatToken(data.in.amount, {
                dp: data.in.token.decimals,
              })}{" "}
              <TextLink
                className="font-normal"
                href={explorer.buildCoinUrl(data.in.coinType)}
                noIcon
              >
                {data.in.token.symbol}
              </TextLink>
              <FromToArrow />
              {formatToken(data.out.amount, {
                dp: data.out.token.decimals,
              })}{" "}
              <TextLink
                className="font-normal"
                href={explorer.buildCoinUrl(data.out.coinType)}
                noIcon
              >
                {data.out.token.symbol}
              </TextLink>
            </TBodySans>
          }
        >
          <div>
            <TokenLogos
              className="h-4 w-4"
              tokens={[data.in.token, data.out.token]}
            />
          </div>
        </Tooltip>

        <div className="flex flex-row items-center gap-1">
          <TBody className="uppercase">
            {data.poolId ? (
              <TextLink
                className="font-normal"
                href={explorer.buildObjectUrl(data.poolId)}
                noIcon
              >
                {data.provider}
              </TextLink>
            ) : (
              data.provider
            )}
          </TBody>
        </div>
      </div>
      <CustomHandle type="source" position={Position.Right} />
    </>
  );
}

interface NodeChartProps {
  quote: StandardizedQuote;
  pathsWithTokens: StandardizedPathWithToken[];
}

function NodeChart({ quote, pathsWithTokens }: NodeChartProps) {
  const swapContext = useSwapContext();
  const tokenIn = swapContext.tokenIn as Token;
  const tokenOut = swapContext.tokenOut as Token;

  // Layout
  const [nodes, setNodes] = useNodesState([]);
  const [edges, setEdges] = useEdgesState([]);
  const { fitView } = useReactFlow();

  useEffect(() => {
    (async () => {
      // Nodes
      const initialNodes: Node[] = [];

      const startNodeData: StartEndNodeData = {
        isStart: true,
        token: tokenIn,
        amount: quote.in.amount,
      };
      initialNodes.push({
        id: "start",
        type: "startEnd",
        position: { x: 0, y: 0 },
        width: getStartEndNodeWidth(startNodeData),
        height: START_END_NODE_HEIGHT,
        data: startNodeData,
      });

      pathsWithTokens.forEach((pathWithToken) => {
        initialNodes.push({
          id: `${pathWithToken.id}-${pathWithToken.routeIndex}`,
          type: "exchange",
          position: { x: 0, y: 0 },
          width: getExchangeNodeWidth(pathWithToken),
          height: EXCHANGE_NODE_HEIGHT,
          data: pathWithToken,
        });
      });

      const endNodeData: StartEndNodeData = {
        token: tokenOut,
        amount: quote.out.amount,
      };
      initialNodes.push({
        id: "end",
        type: "startEnd",
        position: { x: 0, y: 0 },
        width: getStartEndNodeWidth(endNodeData),
        height: START_END_NODE_HEIGHT,
        data: endNodeData,
      });

      // Edges
      const initialEdges: Edge[] = [];

      quote.routes.forEach((route) => {
        for (let i = 0; i < route.path.length + 1; i++) {
          if (i === 0) {
            const path = route.path[i];

            initialEdges.push({
              id: `start_${path.id}-${path.routeIndex}`,
              type: "custom",
              source: "start",
              target: `${path.id}-${path.routeIndex}`,
              label:
                quote.routes.length > 1
                  ? formatPercent(route.percent, { dp: 0 })
                  : undefined,
            });
          } else if (i === route.path.length) {
            const sourcePath = route.path[i - 1];

            initialEdges.push({
              id: `${sourcePath.id}-${sourcePath.routeIndex}_end`,
              type: "custom",
              source: `${sourcePath.id}-${sourcePath.routeIndex}`,
              target: "end",
            });
          } else {
            const sourcePath = route.path[i - 1];
            const path = route.path[i];

            initialEdges.push({
              id: `${sourcePath.id}-${sourcePath.routeIndex}_${path.id}-${path.routeIndex}`,
              type: "custom",
              source: `${sourcePath.id}-${sourcePath.routeIndex}`,
              target: `${path.id}-${path.routeIndex}`,
            });
          }
        }
      });

      // Layouted elements
      const layouted = await getLayoutedElements(initialNodes, initialEdges, {
        "elk.direction": "RIGHT",
        "elk.algorithm": "layered",
        "elk.layered.spacing.nodeNodeBetweenLayers": "60",
        "elk.spacing.nodeNode": "60",
        "elk.layered.layering.strategy": "LONGEST_PATH_SOURCE",
      });

      setNodes(layouted.nodes as any);
      setEdges(layouted.edges as any);
      window.requestAnimationFrame(() =>
        fitView({ padding: 0, minZoom: 0.25, maxZoom: 1 }),
      );
    })();
  }, [
    tokenIn,
    quote.in.amount,
    pathsWithTokens,
    tokenOut,
    quote.out.amount,
    quote.routes,
    setNodes,
    setEdges,
    fitView,
  ]);

  const nodeTypes: NodeTypes = useMemo(
    () => ({ startEnd: StartEndNode, exchange: ExchangeNode }),
    [],
  );
  const edgeTypes: EdgeTypes = useMemo(() => ({ custom: CustomEdge }), []);

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        nodesConnectable={false}
        nodesDraggable={false}
        nodesFocusable={false}
        edges={edges}
        edgesFocusable={false}
        edgesUpdatable={false}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0, minZoom: 0.25, maxZoom: 1 }}
      />
    </div>
  );
}

interface RoutingDialogProps {
  quote: StandardizedQuote;
}

export default function RoutingDialog({ quote }: RoutingDialogProps) {
  const { tokens } = useSwapContext();

  // State
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const onOpenChange = (_isOpen: boolean) => {
    setIsOpen(_isOpen);
  };

  // Paths
  const paths = useMemo(
    () =>
      quote.routes.reduce(
        (acc, route) => [...acc, ...route.path],
        [] as StandardizedRoutePath[],
      ),
    [quote.routes],
  );

  // Paths - coin metadata
  const pathCoinTypes = useMemo(() => {
    const coinTypes: string[] = [];

    for (const path of paths) {
      for (const coinType of [path.in.coinType, path.out.coinType])
        if (!coinTypes.includes(coinType)) coinTypes.push(coinType);
    }

    return coinTypes;
  }, [paths]);

  const coinMetadataMap = useCoinMetadataMap(pathCoinTypes);

  // Paths - add tokens
  const pathsWithTokens = useMemo(() => {
    const result: StandardizedPathWithToken[] = [];

    quote.routes.forEach((route) => {
      route.path.forEach((path) => {
        const inTokenCoinMetadata = coinMetadataMap?.[path.in.coinType];
        const outTokenCoinMetadata = coinMetadataMap?.[path.out.coinType];

        const inToken =
          tokens?.find((t) => t.coinType === path.in.coinType) ||
          (inTokenCoinMetadata
            ? getToken(path.in.coinType, inTokenCoinMetadata)
            : undefined);
        const outToken =
          tokens?.find((t) => t.coinType === path.out.coinType) ||
          (outTokenCoinMetadata
            ? getToken(path.out.coinType, outTokenCoinMetadata)
            : undefined);

        if (!inToken || !outToken) return undefined;

        result.push({
          ...path,
          in: {
            ...path.in,
            token: inToken,
          },
          out: {
            ...path.out,
            token: outToken,
          },
        });
      });
    });

    return result;
  }, [quote.routes, tokens, coinMetadataMap]);

  const hopsCount = paths.length;
  const isLoading = pathsWithTokens.length !== hopsCount;

  return (
    <Dialog
      rootProps={{ open: isOpen, onOpenChange }}
      trigger={
        <Button
          className="h-4 p-0 text-muted-foreground hover:bg-transparent"
          labelClassName="font-sans text-xs"
          startIcon={<Route />}
          variant="ghost"
          size="sm"
        >
          {QUOTE_PROVIDER_NAME_MAP[quote.provider]}
          {" | "}
          {hopsCount} hop{hopsCount !== 1 && "s"}
        </Button>
      }
      headerProps={{
        title: {
          icon: <Route />,
          children: "Routing",
        },
        description: (
          <>
            {QUOTE_PROVIDER_NAME_MAP[quote.provider]}
            {" | "}
            {hopsCount} hop{hopsCount !== 1 && "s"}
          </>
        ),
      }}
      drawerContentProps={{ className: "h-dvh" }}
      dialogContentInnerClassName="h-[800px]"
      dialogContentInnerChildrenWrapperClassName="w-full h-full overflow-hidden"
    >
      {!isLoading && isOpen && (
        <NodeChart quote={quote} pathsWithTokens={pathsWithTokens} />
      )}
    </Dialog>
  );
}
