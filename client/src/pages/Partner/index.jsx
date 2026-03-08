import React from "react";
import TheatreList from "./TheatreList";
import { Tabs, Typography } from "antd";

function Partner() {
  const tabItems = [
    {
      key: "1",
      label: "Theatres",
      children: <TheatreList />,
    },
  ];
  return (
    <div className="dashboard-shell">
      <div className="dashboard-head">
        <Typography.Title level={2} className="m-0">
          Partner Dashboard
        </Typography.Title>
        <Typography.Paragraph className="m-0">
          Manage your theatres, shows, and approvals.
        </Typography.Paragraph>
      </div>

      <div className="dashboard-tabs-wrap">
        <Tabs defaultActiveKey="1" items={tabItems} />
      </div>
    </div>
  );
}

export default Partner;
