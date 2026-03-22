import React, { useCallback, useEffect, useState } from "react";
import { Button, Table, message } from "antd";
import { useDispatch } from "react-redux";
import { hideLoading, showLoading } from "../../../redux/loaderSlice";
import { GetBlockedUsers, UnblockUser } from "../../api/users";
import BlockUserModal from "./BlockUserModal";

function BlockedUsersTable({ openAddBlockedUserSignal = 0 }) {
  const dispatch = useDispatch();
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const getData = useCallback(async () => {
    try {
      dispatch(showLoading());
      const response = await GetBlockedUsers();
      if (response.success) {
        setBlockedUsers(
          (response.data || []).map((user) => ({
            ...user,
            key: `blocked-${user._id}`,
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

  useEffect(() => {
    if (openAddBlockedUserSignal > 0) {
      setIsModalOpen(true);
    }
  }, [openAddBlockedUserSignal]);

  const handleUnblock = async (id) => {
    try {
      dispatch(showLoading());
      const response = await UnblockUser(id);
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
      title: "Role",
      dataIndex: "role",
      key: "role",
      render: (role) => role?.charAt(0)?.toUpperCase() + role?.slice(1),
    },
    {
      title: "Security Reason",
      dataIndex: "blockReason",
      key: "blockReason",
    },
    {
      title: "Blocked On",
      dataIndex: "blockedAt",
      key: "blockedAt",
      render: (value) => (value ? new Date(value).toLocaleString() : "-"),
    },
    {
      title: "Action",
      key: "action",
      render: (_, data) => (
        <div className="d-flex align-items-center gap-10">
          <Button onClick={() => handleUnblock(data._id)}>Unblock</Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <Table dataSource={blockedUsers} columns={columns} pagination={{ pageSize: 6 }} />
      {isModalOpen && (
        <BlockUserModal
          isModalOpen={isModalOpen}
          setIsModalOpen={setIsModalOpen}
          getData={getData}
        />
      )}
    </>
  );
}

export default BlockedUsersTable;
