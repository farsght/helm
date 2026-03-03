import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, Users, Mail } from "lucide-react";

export default function AnalyticsPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Analytics</h1>
        <p className="text-gray-400 mt-1">Track your campaign performance and insights</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card className="bg-[#25252A] border-[#3A3A40]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Sent</CardTitle>
            <Mail className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">1,234</div>
            <p className="text-xs text-green-500 mt-1">+12% from last month</p>
          </CardContent>
        </Card>

        <Card className="bg-[#25252A] border-[#3A3A40]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Open Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">45.2%</div>
            <p className="text-xs text-green-500 mt-1">+3% from last month</p>
          </CardContent>
        </Card>

        <Card className="bg-[#25252A] border-[#3A3A40]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Reply Rate</CardTitle>
            <BarChart3 className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">12.8%</div>
            <p className="text-xs text-green-500 mt-1">+5% from last month</p>
          </CardContent>
        </Card>

        <Card className="bg-[#25252A] border-[#3A3A40]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Meetings Booked</CardTitle>
            <Users className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">23</div>
            <p className="text-xs text-green-500 mt-1">+8 from last month</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <Card className="bg-[#25252A] border-[#3A3A40]">
          <CardHeader>
            <CardTitle className="text-white">Campaign Performance</CardTitle>
            <CardDescription className="text-gray-400">
              Response rates by campaign
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80 flex items-center justify-center border border-dashed border-[#3A3A40] rounded-lg">
              <p className="text-gray-400">Chart placeholder</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#25252A] border-[#3A3A40]">
          <CardHeader>
            <CardTitle className="text-white">Conversion Funnel</CardTitle>
            <CardDescription className="text-gray-400">
              Prospect journey through campaigns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80 flex items-center justify-center border border-dashed border-[#3A3A40] rounded-lg">
              <p className="text-gray-400">Funnel chart placeholder</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
