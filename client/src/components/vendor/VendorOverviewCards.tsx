import { ShoppingBag, Package, ShoppingCart, Wallet, AlertTriangle, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import React from "react";

interface VendorOverviewCountsProps {
	pendingOrders?: number;
	activeListings?: number;
	totalSales?: string;
	totalRevenue?: number;
	earnings?: number;
	disputes?: number;
	isLoading?: boolean;
	trends?: {
		salesChange?: string;
		listingsChange?: string;
		ordersChange?: string;
		earningsChange?: string;
		disputesChange?: string;
	};
	additionalStats?: {
		btcRevenue?: string;
		featuredListings?: number;
		ordersAttention?: number;
		disputesActive?: number;
		avgResponseTime?: string;
	};
}

export function VendorOverviewCards({
	pendingOrders,
	activeListings,
	totalSales,
	totalRevenue,
	earnings,
	disputes,
	isLoading,
	trends,
	additionalStats
}: VendorOverviewCountsProps) {
	const overviewData = [
		{
			title: "Total Sales",
			value: totalSales || "0",
			change: trends?.salesChange || "0 orders",
			changeType: "neutral" as const,
			icon: ShoppingBag,
			description: "Total orders processed"
		},
		{
			title: "Active Listings",
			value: activeListings !== undefined ? String(activeListings) : "0",
			change: trends?.listingsChange || "0 this week",
			changeType: (trends?.listingsChange?.startsWith('+') ? 'positive' : 'neutral') as any,
			icon: Package,
			description: "Published products"
		},
		{
			title: "Pending Orders",
			value: pendingOrders !== undefined ? String(pendingOrders) : "0",
			change: trends?.ordersChange || "0 from yesterday",
			changeType: (trends?.ordersChange?.includes('+') ? "positive" : trends?.ordersChange?.includes('-') ? "negative" : "neutral") as "positive" | "negative" | "neutral",
			icon: ShoppingCart,
			description: `${additionalStats?.ordersAttention || 0} require attention`
		},
		{
			title: "Earnings",
			value: earnings !== undefined ? `$${earnings.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "$0.00",
			change: trends?.earningsChange || "+$0.00",
			changeType: "positive" as const,
			icon: Wallet,
			description: "Lifetime USD volume"
		},
		{
			title: "Disputes",
			value: disputes !== undefined ? String(disputes) : "0",
			change: trends?.disputesChange || "No change",
			changeType: "neutral" as const,
			icon: AlertTriangle,
			description: `${additionalStats?.disputesActive || disputes || 0} active case${(additionalStats?.disputesActive || disputes || 0) !== 1 ? 's' : ''}`
		}
	];

	// Skeleton loader component
	const SkeletonCard = () => (
		<Card className="border border-gray-700 bg-gray-900 hover:shadow-lg transition-shadow duration-200 relative z-10">
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
				<div className="h-4 bg-gray-800 rounded w-20 animate-pulse"></div>
				<div className="w-4 h-4 bg-gray-800 rounded animate-pulse"></div>
			</CardHeader>
			<CardContent>
				<div className="h-8 bg-gray-800 rounded w-24 animate-pulse mb-2"></div>
				<div className="h-4 bg-gray-800 rounded w-16 animate-pulse mb-2"></div>
				<div className="h-3 bg-gray-800 rounded w-32 animate-pulse"></div>
			</CardContent>
		</Card>
	);

	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
			{isLoading ? (
				// Show skeleton loaders while loading
				Array.from({ length: 5 }).map((_, index) => (
					<SkeletonCard key={index} />
				))
			) : (
				// Show actual data when loaded
				overviewData.map((item, index) => {
					const Icon = item.icon;
					return (
						<Card key={index} className="border border-gray-700 bg-gray-900 hover:shadow-lg transition-shadow duration-200 relative z-10">
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="text-sm font-medium text-white">{item.title}</CardTitle>
								<Icon className="w-4 h-4 text-theme-red" />
							</CardHeader>
							<CardContent>
								<div className="text-2xl font-bold text-white">{item.value}</div>
								<div className="flex items-center mt-1">
									<span className={`text-sm ${item.changeType === 'positive' ? 'text-theme-cyan' : item.changeType === 'negative' ? 'text-theme-red' : 'text-white'}`}>{item.change}</span>
								</div>
								<p className="text-xs text-gray-300 mt-1">{item.description}</p>
							</CardContent>
						</Card>
					);
				})
			)}
		</div>
	);
}
