/* eslint-disable jsx-a11y/anchor-is-valid */
import React from "react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
const Post = ({ _id ,title, summary, cover, content, createdAt, author = {} }) => {
  return (
    <>
      <div className="post">
        <div className="image">
          <Link to={`/post/${_id}`}>
            <img
              src={`http://localhost:4000/uploads/${cover}`}
              alt="post-Image"
            />
          </Link>
        </div>
        <div className="texts">
          <Link to={`/post/${_id}`}>
            <h2>{title}</h2>
          </Link>
          <p className="info">
            <a className="author">{author.username}</a>
            <time>{format(new Date(createdAt), "MMM d, yyyy HH:mm")}</time>
          </p>
          <p className="summary">{summary} </p>
        </div>
      </div>
    </>
  );
};

export default Post;
