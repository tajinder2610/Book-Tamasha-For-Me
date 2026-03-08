import React, { useEffect, useCallback, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { HomeOutlined, LogoutOutlined, ProfileOutlined, UserOutlined } from "@ant-design/icons";
import { message, Layout, Menu, Spin } from "antd";
import { showLoading, hideLoading } from "../../redux/loaderSlice";
import { CurrentUser } from "../api/users";
import { setUser } from "../../redux/userSlice";
import AccessDenied from "./AccessDenied";
import MonkeyLogo from "./MonkeyLogo";

const { Header } = Layout;

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user } = useSelector((state) => state.users);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);

  const getValidUser = useCallback(async () => {
    try {
      setLoading(true);
      dispatch(showLoading());
      const response = await CurrentUser();
      dispatch(setUser(response));
    } catch (error) {
      dispatch(setUser(null));
      message.error(error.message || "Authentication failed");
      navigate("/login");
    } finally {
      dispatch(hideLoading());
      setLoading(false);
    }
  }, [dispatch, navigate]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
    } else if (!user) {
      getValidUser();
    }
  }, [user, getValidUser, navigate]);

  if (loading || !user) {
    return (
      <div style={{ display: "flex", justifyContent: "center", marginTop: 50 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <AccessDenied />;
  }

  const isProfilePage = location.pathname === "/profile";
  const isHomePage = location.pathname === "/";

  const navItems = [
    ...(user.role === "user" && isProfilePage
      ? [
          {
            key: "home-shortcut",
            label: (
              <span
                onClick={() => {
                  navigate("/");
                }}
              >
                Home
              </span>
            ),
            icon: <HomeOutlined />,
          },
        ]
      : []),
    {
      key: "user-menu",
      label: <span className="user-menu-label">{user.name || ""}</span>,
      icon: <UserOutlined />,
      children: [
        ...(user.role === "user"
          ? [
              {
                key: "my-profile",
                label: (
                  <span
                    onClick={() => {
                      navigate("/profile");
                    }}
                  >
                    My Profile
                  </span>
                ),
                icon: <ProfileOutlined />,
              },
            ]
          : []),
        {
          key: "logout",
          label: (
            <span
              onClick={() => {
                localStorage.removeItem("token");
                dispatch(setUser(null));
                navigate("/login");
              }}
            >
              Log Out
            </span>
          ),
          icon: <LogoutOutlined />,
        },
      ],
    },
  ];

  const brandContent = (
    <div className="brand-header-wrap" aria-label="Book Tamasha For Me">
      <h2 className="brand-header-text">Book</h2>
      <MonkeyLogo />
      <h2 className="brand-header-text">Tamasha For Me</h2>
    </div>
  );

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Header
        className="d-flex justify-content-between app-header-animated"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 1,
          width: "100%",
          minHeight: 74,
          height: 74,
          display: "flex",
          alignItems: "center",
        }}
      >
        <div className="road-runners" aria-hidden="true">
          <div className="road-runners-track">
            <div className="runner-group">
              <span className="runner-icon">{"\u{1F3AC}"}</span>
              <span className="runner-icon">{"\u{1F37F}"}</span>
            </div>
            <div className="runner-group">
              <span className="runner-icon">{"\u{1F39F}\u{FE0F}"}</span>
              <span className="runner-icon">{"\u{1F3AD}"}</span>
              <span className="runner-icon">{"\u{1F39E}\u{FE0F}"}</span>
              <span className="runner-icon">{"\u{1F4FD}\u{FE0F}"}</span>
              <span className="runner-icon">{"\u{1FA91}"}</span>
            </div>
            <div className="runner-group">
              <span className="runner-icon">{"\u{1F369}"}</span>
              <span className="runner-icon">{"\u{1F355}"}</span>
              <span className="runner-icon">{"\u{1F354}"}</span>
              <span className="runner-icon">{"\u{1F964}"}</span>
            </div>
          </div>
        </div>
        {user.role === "user" ? (
          <Link to="/" className="brand-home-link">
            {brandContent}
          </Link>
        ) : (
          brandContent
        )}
        <Menu
          className="header-user-menu"
          theme="dark"
          mode="horizontal"
          items={navItems}
          selectedKeys={[]}
        />
      </Header>
      <div
        style={{
          padding: 24,
          flex: 1,
          background: isHomePage
            ? "radial-gradient(circle at 10% 12%, rgba(255, 209, 127, 0.28), transparent 34%), radial-gradient(circle at 88% 88%, rgba(176, 210, 255, 0.24), transparent 36%), linear-gradient(135deg, #f8fbff 0%, #eef4ff 100%)"
            : "#fff",
        }}
      >
        {children}
      </div>
    </Layout>
  );
};

export default ProtectedRoute;


