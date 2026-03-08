import React from "react";
import MovieList from "./MovieList";
import TheatresTable from "./TheatresTable";
import { Tabs, Typography } from "antd";

function Admin() {
  const tabItems = [
    {
      key: "1",
      label: "Movies",
      children: <MovieList />,
    },
    {
      key: "2",
      label: "Theatres",
      children: <TheatresTable />,
    },
  ];
  return (
    <div className="dashboard-shell">
      <div className="dashboard-head">
        <Typography.Title level={2} className="m-0">
          Admin Dashboard
        </Typography.Title>
        <Typography.Paragraph className="m-0">
          Manage movies and review theatre approvals in one place.
        </Typography.Paragraph>
      </div>

      <div className="dashboard-tabs-wrap">
        <Tabs defaultActiveKey="1" items={tabItems} />
      </div>
    </div>
  );
}

export default Admin;
