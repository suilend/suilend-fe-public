import { CSSProperties, useMemo, useState } from "react";

import Dagre from "@dagrejs/dagre";
import BigNumber from "bignumber.js";
import { Route } from "lucide-react";
import ReactFlow, { Edge, Handle, Node, Position } from "reactflow";

import { getToken } from "@suilend/frontend-sui";
import { useSettingsContext } from "@suilend/frontend-sui-next";
import useCoinMetadataMap from "@suilend/frontend-sui-next/hooks/useCoinMetadataMap";

import Dialog from "@/components/dashboard/Dialog";
import Button from "@/components/shared/Button";
import Spinner from "@/components/shared/Spinner";
import TextLink from "@/components/shared/TextLink";
import TokenLogo from "@/components/shared/TokenLogo";
import TokenLogos from "@/components/shared/TokenLogos";
import Tooltip from "@/components/shared/Tooltip";
import { TBody, TBodySans, TLabelSans } from "@/components/shared/Typography";
import {
  StandardizedPathWithToken,
  StandardizedQuote,
  StandardizedRoutePath,
  useSwapContext,
} from "@/contexts/SwapContext";
import { formatId, formatToken } from "@/lib/format";
import { SwapToken } from "@/lib/types";
import { cn, hoverUnderlineClassName } from "@/lib/utils";

import "reactflow/dist/style.css";

const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
const getLayoutedElements = (nodes: any[], edges: any[], options: any) => {
  g.setGraph({ rankdir: options.direction });

  edges.forEach((edge) => g.setEdge(edge.source, edge.target));
  nodes.forEach((node) => g.setNode(node.id, node));

  Dagre.layout(g);

  return {
    nodes: nodes.map((node) => {
      const position = g.node(node.id);
      // We are shifting the dagre node position (anchor=center center) to the top left
      // so it matches the React Flow node anchor point (top left).
      const x = position.x - node.width / 2;
      const y = position.y - node.height / 2;

      return { ...node, position: { x, y } };
    }),
    edges,
  };
};

const START_END_NODE_WIDTH = 200; // px
const START_END_NODE_HEIGHT = 36; // px

interface StartEndNodeProps {
  data: {
    isStart?: boolean;
    token: SwapToken;
    amount: BigNumber;
  };
}

function StartEndNode({ data }: StartEndNodeProps) {
  const { isStart, token, amount } = data;

  return (
    <>
      {!isStart && <Handle type="target" position={Position.Left} />}
      <div
        className={cn(
          "flex flex-row justify-center",
          isStart ? "justify-end" : "justify-start",
        )}
        style={{
          width: `${START_END_NODE_WIDTH}px`,
          height: `${START_END_NODE_HEIGHT}px`,
        }}
      >
        <div className="w-max rounded-md bg-muted/10 px-3 py-2">
          <Tooltip
            title={`${formatToken(amount, { dp: token.decimals })} ${token.symbol}`}
          >
            <div className="flex flex-row items-center gap-1.5">
              <TokenLogo
                className="h-4 w-4"
                imageProps={{ className: "rounded-full" }}
                token={token}
              />

              <TBody
                className={cn(
                  "decoration-foreground/50",
                  hoverUnderlineClassName,
                )}
              >
                {formatToken(amount, { exact: false })} {token.symbol}
              </TBody>
            </div>
          </Tooltip>
        </div>
      </div>
      {isStart && <Handle type="source" position={Position.Right} />}
    </>
  );
}

const EXCHANGE_NODE_WIDTH = 160; // px
const EXCHANGE_NODE_HEIGHT = (3 + 5 + 1.5 + 5 + 3) * 4; // px

interface ExchangeNodeProps {
  data: StandardizedPathWithToken;
}

function ExchangeNode({ data }: ExchangeNodeProps) {
  const { explorer } = useSettingsContext();

  return (
    <>
      <Handle type="target" position={Position.Left} />
      <div
        className="flex flex-col items-center gap-1.5 rounded-md bg-card px-4 py-3"
        style={{
          width: `${EXCHANGE_NODE_WIDTH}px`,
          height: `${EXCHANGE_NODE_HEIGHT}px`,
        }}
      >
        <Tooltip
          content={
            <TLabelSans className="text-xs">
              <TextLink
                className="font-normal"
                href={explorer.buildObjectUrl(data.id)}
                noIcon
              >
                {formatId(data.id)}
              </TextLink>
            </TLabelSans>
          }
        >
          <TBodySans
            className={cn(
              "text-muted-foreground decoration-muted-foreground/50",
              hoverUnderlineClassName,
            )}
          >
            {data.provider}
          </TBodySans>
        </Tooltip>

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
              {" → "}
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
          <div
            className="flex flex-row items-center gap-2"
            style={
              {
                "--bg-color": "hsl(var(--card))",
              } as CSSProperties
            }
          >
            <TokenLogos
              className="h-4 w-4"
              tokens={[data.in.token, data.out.token]}
            />

            <TBody
              className={cn(
                "text-foreground decoration-foreground/50",
                hoverUnderlineClassName,
              )}
            >
              {data.in.token.symbol}
              <span className="font-sans">/</span>
              {data.out.token.symbol}
            </TBody>
          </div>
        </Tooltip>
      </div>
      <Handle type="source" position={Position.Right} />
    </>
  );
}

interface NodeChartProps {
  quote: StandardizedQuote;
  pathsWithTokens: StandardizedPathWithToken[];
}

function NodeChart({ quote, pathsWithTokens }: NodeChartProps) {
  const swapContext = useSwapContext();
  const tokenIn = swapContext.tokenIn as SwapToken;
  const tokenOut = swapContext.tokenOut as SwapToken;

  // Layout
  const initialNodesEdges = (() => {
    // Nodes
    const initialNodes: Node[] = [];

    initialNodes.push({
      id: "start",
      type: "startEnd",
      position: { x: 0, y: 0 },
      width: START_END_NODE_WIDTH,
      height: START_END_NODE_HEIGHT,
      data: {
        isStart: true,
        token: tokenIn,
        amount: quote.in.amount,
      },
    });
    pathsWithTokens.forEach((pathWithToken) => {
      initialNodes.push({
        id: `${pathWithToken.id}-${pathWithToken.routeIndex}`,
        type: "exchange",
        position: { x: 0, y: 0 },
        width: EXCHANGE_NODE_WIDTH,
        height: EXCHANGE_NODE_HEIGHT,
        data: pathWithToken,
      });
    });
    initialNodes.push({
      id: "end",
      type: "startEnd",
      position: { x: 0, y: 0 },
      width: START_END_NODE_WIDTH,
      height: START_END_NODE_HEIGHT,
      data: {
        token: tokenOut,
        amount: quote.out.amount,
      },
    });

    // Edges
    const initialEdges: Edge[] = [];

    quote.routes.forEach((route) => {
      for (let i = 0; i < route.path.length + 1; i++) {
        if (i === 0) {
          const path = route.path[i];

          initialEdges.push({
            id: `start_${path.id}-${path.routeIndex}`,
            source: "start",
            target: `${path.id}-${path.routeIndex}`,
          });
        } else if (i === route.path.length) {
          const sourcePath = route.path[i - 1];

          initialEdges.push({
            id: `${sourcePath.id}-${sourcePath.routeIndex}_end`,
            source: `${sourcePath.id}-${sourcePath.routeIndex}`,
            target: "end",
          });
        } else {
          const sourcePath = route.path[i - 1];
          const path = route.path[i];

          initialEdges.push({
            id: `${sourcePath.id}-${sourcePath.routeIndex}_${path.id}-${path.routeIndex}`,
            source: `${sourcePath.id}-${sourcePath.routeIndex}`,
            target: `${path.id}-${path.routeIndex}`,
          });
        }
      }
    });

    // Layout
    const layouted = getLayoutedElements(initialNodes, initialEdges, {
      direction: "LR",
    });

    return {
      nodes: layouted.nodes,
      edges: layouted.edges,
    };
  })();

  const nodeTypes = useMemo(
    () => ({ startEnd: StartEndNode, exchange: ExchangeNode }),
    [],
  );

  return (
    <div className="h-full w-full pt-0 md:p-4">
      <ReactFlow
        nodeTypes={nodeTypes}
        defaultNodes={initialNodesEdges.nodes}
        defaultEdges={initialNodesEdges.edges}
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
          variant="ghost"
          size="sm"
        >
          {hopsCount} hop{hopsCount !== 1 && "s"} ({quote.type})
        </Button>
      }
      dialogContentProps={{ className: "h-[600px]" }}
      headerProps={{
        className: "pb-0",
        titleIcon: <Route />,
        title: "Routing",
      }}
      isDialogAutoHeight
    >
      {isLoading ? (
        <div className="flex h-full w-full flex-row items-center justify-center">
          <Spinner size="md" />
        </div>
      ) : (
        isOpen && <NodeChart quote={quote} pathsWithTokens={pathsWithTokens} />
      )}
    </Dialog>
  );
}
