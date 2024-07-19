/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable jsx-a11y/anchor-is-valid */

import React, { useEffect, useContext } from "react";
import { Link } from "react-router-dom";
import { UserContext } from "./userContext";
const Header = () => {
  const { setUserInfo , userInfo } = useContext(UserContext); 
  useEffect(() => {
    fetch("http://localhost:4000/profile", {
      credentials: "include",
    }).then((response) => {
      response.json().then((userInfo) => {
        setUserInfo(userInfo);
      });
    });
  }, []);
  function logout() {
    fetch("http://localhost:4000/logout", {
      credentials: 'include',
      method: 'POST'
    });
    setUserInfo(null);
  }
  const username = userInfo?.username;

  return (
    <>
      <header>
        <Link to="/" className="logo">
          MyBlog
        </Link>
        <nav>
          {username && (
            <>
              <Link to="/create">Create New Post</Link>
              <a onClick={logout}>Logout</a>
            </>
          )}
          {!username && (
            <>
              <Link to="/login" className="logo">
                Login
              </Link>
              <Link to="/register" className="logo">
                Register
              </Link>
            </>
          )}
        </nav>
      </header>
    </>
  );
};

export default Header;
