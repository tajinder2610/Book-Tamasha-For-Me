import React, { useState } from "react";
import TheatreList from "./TheatreList";
import { Button, Tabs, Typography } from "antd";

function Partner() {
  const [openAddTheatreSignal, setOpenAddTheatreSignal] = useState(0);

  const tabItems = [
    {
      key: "1",
      label: "Theatres",
      children: <TheatreList openAddTheatreSignal={openAddTheatreSignal} />,
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
        <Tabs
          defaultActiveKey="1"
          items={tabItems}
          tabBarExtraContent={
            <Button
              type="primary"
              className="dashboard-action-btn"
              onClick={() => setOpenAddTheatreSignal((prev) => prev + 1)}
            >
              Add Theatre
            </Button>
          }
        />
      </div>
    </div>
  );
}

export default Partner;
