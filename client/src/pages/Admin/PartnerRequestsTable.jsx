import React, { useCallback, useEffect, useState } from "react";
import { Button, Table, message } from "antd";
import { useDispatch } from "react-redux";
import { hideLoading, showLoading } from "../../../redux/loaderSlice";
import { GetPartnerRequests, UpdatePartnerRequestStatus } from "../../api/users";

function PartnerRequestsTable() {
  const dispatch = useDispatch();
  const [partnerRequests, setPartnerRequests] = useState([]);

  const getData = useCallback(async () => {
    try {
      dispatch(showLoading());
      const response = await GetPartnerRequests();

      if (response.success) {
        setPartnerRequests(
          response.data.map((user) => ({
            ...user,
            key: user._id,
          }))
        );
      } else {
        message.error(response.message);
      }
    } catch (err) {
      message.error(err.message);
    } finally {
      dispatch(hideLoading());
    }
  }, [dispatch]);

  useEffect(() => {
    getData();
  }, [getData]);

  const handleStatusUpdate = async (id, status) => {
    try {
      dispatch(showLoading());
      const response = await UpdatePartnerRequestStatus(id, status);

      if (response.success) {
        message.success(response.message);
        getData();
      } else {
        message.error(response.message);
      }
    } catch (err) {
      message.error(err.message);
    } finally {
      dispatch(hideLoading());
    }
  };

  const columns = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
    },
    {
      title: "Current Role",
      dataIndex: "role",
      key: "role",
      render: (role) => role?.charAt(0)?.toUpperCase() + role?.slice(1),
    },
    {
      title: "Status",
      dataIndex: "partnerRequestStatus",
      key: "partnerRequestStatus",
      render: (_, data) => {
        if (data.partnerRequestStatus === "approved") {
          return "Approved";
        } else {
          return "Pending/Blocked";
        }
      },
    },
    {
      title: "Requested On",
      dataIndex: "partnerRequestSubmittedAt",
      key: "partnerRequestSubmittedAt",
      render: (value) => (value ? new Date(value).toLocaleString() : "-"),
    },
    {
      title: "Action",
      key: "action",
      render: (_, data) => (
        <div className="d-flex align-items-center gap-10">
          {data.partnerRequestStatus === "approved" ? (
            <Button onClick={() => handleStatusUpdate(data._id, "blocked")}>
              Block
            </Button>
          ) : (
            <Button onClick={() => handleStatusUpdate(data._id, "approved")}>
              Approve
            </Button>
          )}
        </div>
      ),
    },
  ];

  return <Table dataSource={partnerRequests} columns={columns} pagination={{ pageSize: 6 }} />;
}

export default PartnerRequestsTable;
