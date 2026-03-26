import React, { useEffect, useRef, useState } from "react";
import { Button, Empty, Form, Input, List, Modal, Typography, message } from "antd";
import { CloseOutlined } from "@ant-design/icons";
import { useDispatch } from "react-redux";
import { hideLoading, showLoading } from "../../../redux/loaderSlice";
import { BlockUser, SearchUsersForBlocking } from "../../api/users";

const { TextArea } = Input;

function BlockUserModal({ isModalOpen, setIsModalOpen, getData }) {
  const dispatch = useDispatch();
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searchValue, setSearchValue] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [form] = Form.useForm();
  const latestSearchRef = useRef("");

  useEffect(() => {
    if (!isModalOpen) {
      setSearchResults([]);
      setSelectedUsers([]);
      setSearchValue("");
      setIsSearching(false);
      form.resetFields();
    }
  }, [form, isModalOpen]);

  const handleSearch = async (value) => {
    const search = String(value || "").trim();
    latestSearchRef.current = search;

    if (!search) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);
      dispatch(showLoading());
      const response = await SearchUsersForBlocking(search);
      if (latestSearchRef.current !== search) {
        return;
      }

      if (response.success) {
        const selectedUserIds = new Set(selectedUsers.map((user) => user._id));
        setSearchResults(
          (response.data || []).filter((user) => !selectedUserIds.has(user._id))
        );
      } else {
        message.error(response.message);
      }
    } catch (err) {
      message.error(err.message);
    } finally {
      setIsSearching(false);
      dispatch(hideLoading());
    }
  };

  useEffect(() => {
    if (!isModalOpen) return undefined;

    const timer = setTimeout(() => {
      handleSearch(searchValue);
    }, 350);

    return () => clearTimeout(timer);
  }, [isModalOpen, searchValue]);

  const handleCancel = () => {
    setIsModalOpen(false);
  };

  const handleSelectUser = (user) => {
    setSelectedUsers((currentUsers) => {
      if (currentUsers.some((currentUser) => currentUser._id === user._id)) {
        return currentUsers;
      }
      return [...currentUsers, user];
    });
    setSearchResults((currentResults) =>
      currentResults.filter((currentUser) => currentUser._id !== user._id)
    );
    setSearchValue("");
  };

  const handleRemoveUser = (userId) => {
    setSelectedUsers((currentUsers) =>
      currentUsers.filter((user) => user._id !== userId)
    );
  };

  const onFinish = async (values) => {
    if (!selectedUsers.length) {
      message.error("Please select at least one user to block");
      return;
    }

    try {
      dispatch(showLoading());
      const response = await BlockUser({
        userIds: selectedUsers.map((user) => user._id),
        reason: values.reason,
      });
      if (response.success) {
        message.success(response.message);
        getData();
        setIsModalOpen(false);
      } else {
        message.error(response.message);
      }
    } catch (err) {
      message.error(err.message);
    } finally {
      dispatch(hideLoading());
    }
  };

  return (
    <Modal
      centered
      title="Block User"
      open={isModalOpen}
      onCancel={handleCancel}
      width={640}
      footer={null}
    >
      <Form layout="vertical" form={form} onFinish={onFinish}>
        <Form.Item label="Search User" className="block-user-search-field">
          <Input
            placeholder="Search by name or email"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            allowClear
          />
        </Form.Item>

        <div className="block-user-search-results">
          {searchValue.trim() ? (
            <div className="block-user-search-dropdown">
              <List
                locale={{
                  emptyText: isSearching ? "Searching users..." : <Empty description="No users found" image={Empty.PRESENTED_IMAGE_SIMPLE} />,
                }}
                dataSource={searchResults}
                renderItem={(user) => (
                  <List.Item
                    className="block-user-search-item"
                    onClick={() => handleSelectUser(user)}
                  >
                    <div className="block-user-search-copy">
                      <Typography.Text strong>{user.name}</Typography.Text>
                      <Typography.Text type="secondary">{user.email}</Typography.Text>
                    </div>
                    <Typography.Text className="block-user-role-pill">
                      {user.role}
                    </Typography.Text>
                  </List.Item>
                )}
              />
            </div>
          ) : (
            <div className="block-user-search-results-empty" />
          )}
        </div>

        {selectedUsers.length > 0 && (
          <div className="block-user-selected-card">
            <Typography.Text strong>Selected Users</Typography.Text>
            <div className="block-user-selected-list">
              {selectedUsers.map((user) => (
                <div key={user._id} className="block-user-selected-item">
                  <div className="block-user-selected-meta">
                    <span>{user.name}</span>
                    <span>{user.email}</span>
                    <span className="block-user-role-pill">{user.role}</span>
                  </div>
                  <Button
                    type="text"
                    className="block-user-remove-btn"
                    onClick={() => handleRemoveUser(user._id)}
                    aria-label={`Remove ${user.name}`}
                  >
                    <CloseOutlined />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <Form.Item
          label="Security Reason"
          name="reason"
          rules={[{ required: true, message: "Security reason is required" }]}
        >
          <TextArea
            rows={4}
            placeholder="Enter the reason for blocking this user"
          />
        </Form.Item>

        <Form.Item className="m-0">
          <div className="block-user-modal-actions">
            <Button block type="primary" danger htmlType="submit">
            Block
            </Button>
            <Button block onClick={handleCancel}>
              Cancel
            </Button>
          </div>
        </Form.Item>
      </Form>
    </Modal>
  );
}

export default BlockUserModal;
