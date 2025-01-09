import { CSSProperties, useEffect, useMemo, useRef, useState } from "react";

import { Path as CetusRoutePath } from "@cetusprotocol/aggregator-sdk";
import Dagre from "@dagrejs/dagre";
import { CoinMetadata } from "@mysten/sui/client";
import { RouterTradePath as AftermathRoutePath } from "aftermath-ts-sdk";
import BigNumber from "bignumber.js";
import { Route } from "lucide-react";
import ReactFlow, { Edge, Handle, Node, Position } from "reactflow";

import { getCoinMetadataMap } from "@suilend/frontend-sui";
import { useSettingsContext } from "@suilend/frontend-sui-next";

import Dialog from "@/components/dashboard/Dialog";
import Button from "@/components/shared/Button";
import Spinner from "@/components/shared/Spinner";
import TextLink from "@/components/shared/TextLink";
import TokenLogo from "@/components/shared/TokenLogo";
import TokenLogos from "@/components/shared/TokenLogos";
import Tooltip from "@/components/shared/Tooltip";
import { TBody, TBodySans, TLabelSans } from "@/components/shared/Typography";
import {
  StandardizedQuote,
  StandardizedQuoteType,
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

const useGetCoinMetadataMap = (coinTypes: string[]) => {
  const { suiClient } = useSettingsContext();

  const fetchingCoinTypesRef = useRef<string[]>([]);
  const [coinMetadataMap, setCoinMetadataMap] = useState<
    Record<string, CoinMetadata>
  >({});
  useEffect(() => {
    (async () => {
      const filteredCoinTypes = coinTypes.filter(
        (coinType) =>
          !coinMetadataMap[coinType] &&
          !fetchingCoinTypesRef.current.includes(coinType),
      );
      if (filteredCoinTypes.length === 0) return;

      fetchingCoinTypesRef.current.push(...filteredCoinTypes);

      const result = await getCoinMetadataMap(suiClient, coinTypes);
      setCoinMetadataMap(result);
      fetchingCoinTypesRef.current = fetchingCoinTypesRef.current.filter(
        (coinType) => !filteredCoinTypes.includes(coinType),
      );
    })();
  }, [coinTypes, coinMetadataMap, suiClient]);

  return coinMetadataMap;
};

type QuoteNodeWithTokens = {
  id: string;
  routeIndex: number;
  provider: string;
  amount_in: { amount: string } & SwapToken;
  amount_out: { amount: string } & SwapToken;
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
  data: QuoteNodeWithTokens;
}

function ExchangeNode({ data }: ExchangeNodeProps) {
  const { explorer } = useSettingsContext();

  const amountIn = BigNumber(data.amount_in.amount.toString()).div(
    10 ** data.amount_in.decimals,
  );
  const amountOut = BigNumber(data.amount_out.amount.toString()).div(
    10 ** data.amount_out.decimals,
  );

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
              {formatToken(amountIn, { dp: data.amount_in.decimals })}{" "}
              <TextLink
                className="font-normal"
                href={explorer.buildCoinUrl(data.amount_in.coinType)}
                noIcon
              >
                {data.amount_in.symbol}
              </TextLink>
              {" → "}
              {formatToken(amountOut, { dp: data.amount_out.decimals })}{" "}
              <TextLink
                className="font-normal"
                href={explorer.buildCoinUrl(data.amount_out.coinType)}
                noIcon
              >
                {data.amount_out.symbol}
              </TextLink>
            </TBodySans>
          }
        >
          <div
            className="flex flex-row items-center gap-2"
            style={
              {
                "--bg-color": "hsl(var(--popover))",
              } as CSSProperties
            }
          >
            <TokenLogos
              className="h-4 w-4"
              tokens={[data.amount_in, data.amount_out]}
            />

            <TBody
              className={cn(
                "text-foreground decoration-foreground/50",
                hoverUnderlineClassName,
              )}
            >
              {data.amount_in.symbol}
              <span className="font-sans">/</span>
              {data.amount_out.symbol}
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
  quoteNodesWithTokens: QuoteNodeWithTokens[];
}

function NodeChart({ quote, quoteNodesWithTokens }: NodeChartProps) {
  const swapContext = useSwapContext();
  const tokenIn = swapContext.tokenIn as SwapToken;
  const tokenOut = swapContext.tokenOut as SwapToken;

  // Layout
  const initialNodesEdges = (() => {
    // Nodes
    const quoteAmountIn = BigNumber(quote.amount_in.toString());
    const quoteAmountOut = BigNumber(quote.amount_out.toString());

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
        amount: quoteAmountIn,
      },
    });
    quoteNodesWithTokens.forEach((node) => {
      initialNodes.push({
        id: `${node.id}-${node.routeIndex}`,
        type: "exchange",
        position: { x: 0, y: 0 },
        width: EXCHANGE_NODE_WIDTH,
        height: EXCHANGE_NODE_HEIGHT,
        data: node,
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
        amount: quoteAmountOut,
      },
    });

    // Edges
    const initialEdges: Edge[] = [];

    if (quote.type === StandardizedQuoteType.AFTERMATH) {
      quote.quote.routes.forEach((route, routeIndex) => {
        for (let i = 0; i < route.paths.length + 1; i++) {
          if (i === 0) {
            const path = route.paths[i];

            initialEdges.push({
              id: `start_${path.poolId}-${routeIndex}`,
              source: "start",
              target: `${path.poolId}-${routeIndex}`,
            });
          } else if (i === route.paths.length) {
            const sourcePath = route.paths[i - 1];

            initialEdges.push({
              id: `${sourcePath.poolId}-${routeIndex}_end`,
              source: `${sourcePath.poolId}-${routeIndex}`,
              target: "end",
            });
          } else {
            const sourcePath = route.paths[i - 1];
            const path = route.paths[i];

            initialEdges.push({
              id: `${sourcePath.poolId}-${routeIndex}_${path.poolId}-${routeIndex}`,
              source: `${sourcePath.poolId}-${routeIndex}`,
              target: `${path.poolId}-${routeIndex}`,
            });
          }
        }
      });
    } else if (quote.type === StandardizedQuoteType.CETUS) {
      quote.quote.routes.forEach((route, routeIndex) => {
        for (let i = 0; i < route.path.length + 1; i++) {
          if (i === 0) {
            const path = route.path[i];

            initialEdges.push({
              id: `start_${path.id}-${routeIndex}`,
              source: "start",
              target: `${path.id}_${routeIndex}`,
            });
          } else if (i === route.path.length) {
            const sourcePath = route.path[i - 1];

            initialEdges.push({
              id: `${sourcePath.id}-${routeIndex}_end`,
              source: `${sourcePath.id}_${routeIndex}`,
              target: "end",
            });
          } else {
            const sourcePath = route.path[i - 1];
            const path = route.path[i];

            initialEdges.push({
              id: `${sourcePath.id}-${routeIndex}_${path.id}-${routeIndex}`,
              source: `${sourcePath.id}_${routeIndex}`,
              target: `${path.id}_${routeIndex}`,
            });
          }
        }
      });
    }

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

  // Coin metadata
  const nodeTokenCoinTypes = useMemo(() => {
    const coinTypes: string[] = [];

    if (quote.type === StandardizedQuoteType.AFTERMATH) {
      const paths = quote.quote.routes.reduce(
        (acc, route) => [...acc, ...route.paths],
        [] as AftermathRoutePath[],
      );

      for (const path of paths) {
        for (const coinType of [path.coinIn.type, path.coinOut.type])
          if (!coinTypes.includes(coinType)) coinTypes.push(coinType);
      }
    } else if (quote.type === StandardizedQuoteType.CETUS) {
      const paths = quote.quote.routes.reduce(
        (acc, route) => [...acc, ...route.path],
        [] as CetusRoutePath[],
      );

      for (const path of paths) {
        for (const coinType of [path.from, path.target])
          if (!coinTypes.includes(coinType)) coinTypes.push(coinType);
      }
    }

    return coinTypes;
  }, [quote]);

  const coinMetadataMap = useGetCoinMetadataMap(nodeTokenCoinTypes);

  // Quote
  const quoteNodesWithTokens = useMemo(() => {
    const result: QuoteNodeWithTokens[] = [];

    if (quote.type === StandardizedQuoteType.AFTERMATH) {
      quote.quote.routes.forEach((route, index) => {
        route.paths.forEach((path) => {
          const inToken = tokens?.find((t) => t.coinType === path.coinIn.type);
          const outToken = tokens?.find(
            (t) => t.coinType === path.coinOut.type,
          );

          const inCoinMetadata = coinMetadataMap[path.coinIn.type];
          const outCoinMetadata = coinMetadataMap[path.coinOut.type];

          if (!(inToken || inCoinMetadata) || !(outToken || outCoinMetadata))
            return undefined;

          result.push({
            id: path.poolId,
            routeIndex: index,
            provider: path.protocolName,
            amount_in: {
              amount: path.coinIn.amount.toString(),
              ...({
                coinType: path.coinIn.type,
                decimals: inToken?.decimals ?? inCoinMetadata?.decimals,
                symbol: inToken?.symbol ?? inCoinMetadata?.symbol,
                name: inToken?.name ?? inCoinMetadata?.name,
                iconUrl: inToken?.iconUrl ?? inCoinMetadata?.iconUrl,
              } as SwapToken),
            },
            amount_out: {
              amount: path.coinOut.amount.toString(),
              ...({
                coinType: path.coinOut.type,
                decimals: outToken?.decimals ?? outCoinMetadata?.decimals,
                symbol: outToken?.symbol ?? outCoinMetadata?.symbol,
                name: outToken?.name ?? outCoinMetadata?.name,
                iconUrl: outToken?.iconUrl ?? outCoinMetadata?.iconUrl,
              } as SwapToken),
            },
          });
        });
      });

      return result.filter(Boolean) as QuoteNodeWithTokens[];
    } else if (quote.type === StandardizedQuoteType.CETUS) {
      quote.quote.routes.forEach((route, index) => {
        route.path.forEach((path) => {
          const inToken = tokens?.find((t) => t.coinType === path.from);
          const outToken = tokens?.find((t) => t.coinType === path.target);

          const inCoinMetadata = coinMetadataMap[path.from];
          const outCoinMetadata = coinMetadataMap[path.target];

          if (!(inToken || inCoinMetadata) || !(outToken || outCoinMetadata))
            return undefined;

          result.push({
            id: path.id,
            routeIndex: index,
            provider: path.provider,
            amount_in: {
              amount: path.amountIn.toString(),
              ...({
                coinType: path.from,
                decimals: inToken?.decimals ?? inCoinMetadata?.decimals,
                symbol: inToken?.symbol ?? inCoinMetadata?.symbol,
                name: inToken?.name ?? inCoinMetadata?.name,
                iconUrl: inToken?.iconUrl ?? inCoinMetadata?.iconUrl,
              } as SwapToken),
            },
            amount_out: {
              amount: path.amountOut.toString(),
              ...({
                coinType: path.target,
                decimals: outToken?.decimals ?? outCoinMetadata?.decimals,
                symbol: outToken?.symbol ?? outCoinMetadata?.symbol,
                name: outToken?.name ?? outCoinMetadata?.name,
                iconUrl: outToken?.iconUrl ?? outCoinMetadata?.iconUrl,
              } as SwapToken),
            },
          });
        });
      });

      return result.filter(Boolean) as QuoteNodeWithTokens[];
    }

    return [];
  }, [quote, tokens, coinMetadataMap]);

  const hopsCount = useMemo(() => {
    if (quote.type === StandardizedQuoteType.AFTERMATH) {
      return quote.quote.routes.reduce(
        (acc, route) => acc + route.paths.length,
        0,
      );
    } else if (quote.type === StandardizedQuoteType.CETUS) {
      return quote.quote.routes.reduce(
        (acc, route) => acc + route.path.length,
        0,
      );
    }

    return 0;
  }, [quote]);
  const isLoading = quoteNodesWithTokens.length !== hopsCount;

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
        isOpen && (
          <NodeChart
            quote={quote}
            quoteNodesWithTokens={quoteNodesWithTokens}
          />
        )
      )}
    </Dialog>
  );
}
