import React, { useState } from "react";
import MovieList from "./MovieList";
import TheatresTable from "./TheatresTable";
import { Button, Tabs, Typography } from "antd";

function Admin() {
  const [openAddMovieSignal, setOpenAddMovieSignal] = useState(0);
  const [activeTab, setActiveTab] = useState("1");

  const tabItems = [
    {
      key: "1",
      label: "Movies",
      children: <MovieList openAddMovieSignal={openAddMovieSignal} />,
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
        <Tabs
          defaultActiveKey="1"
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          tabBarExtraContent={activeTab === "1" ? (
            <Button
              type="primary"
              className="dashboard-action-btn"
              onClick={() => setOpenAddMovieSignal((prev) => prev + 1)}
            >
              Add Movie
            </Button>
          ) : null}
        />
      </div>
    </div>
  );
}

export default Admin;
