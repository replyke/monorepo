import React, { ReactNode, MouseEvent, useEffect, useState } from "react";

interface ModalProps {
  show: boolean;
  onClose?: () => void;
  children: ReactNode;
}

const Modal: React.FC<ModalProps> = ({ show, onClose, children }) => {
  const [isVisible, setIsVisible] = useState(show);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
    }
  }, [show]);

  const handleOverlayClick = (e: MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    onClose?.();
  };

  // const handleContentClick = (e: MouseEvent<HTMLDivElement>) => {
  //   e.stopPropagation();
  // };

  const handleAnimationEnd = () => {
    if (!show) {
      setIsVisible(false);
    }
  };

  useEffect(() => {
    const styleSheet = document.createElement("style");
    styleSheet.type = "text/css";
    styleSheet.innerText = `
      @keyframes fadeIn {
        from {
          background: rgba(0, 0, 0, 0);
        }
        to {
          background: rgba(0, 0, 0, 0.5);
        }
      }
      @keyframes fadeOut {
        from {
          background: rgba(0, 0, 0, 0.5);
        }
        to {
          background: rgba(0, 0, 0, 0);
        }
      }
    `;
    document.head.appendChild(styleSheet);

    return () => {
      document.head.removeChild(styleSheet);
    };
  }, []);

  if (!isVisible) {
    return null;
  }

  const modalOverlayStyle: React.CSSProperties = {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background: show ? "rgba(0, 0, 0, 0.5)" : "rgba(0, 0, 0, 0)", // Background based on show state
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "stretch",
    zIndex: 1000,
    animation: show ? "fadeIn 0.5s forwards" : "fadeOut 0.5s forwards", // Apply fadeIn or fadeOut
    visibility: show ? "visible" : "hidden",
  };

  // const modalContentStyle: React.CSSProperties = {
  //   position: "relative",
  //   width: "max-content",
  //   backgroundColor:"yellow",
  // };

  // const modalCloseStyle: React.CSSProperties = {
  //   position: 'absolute',
  //   top: '10px',
  //   right: '10px',
  //   background: 'none',
  //   border: 'none',
  //   fontSize: '20px',
  //   cursor: 'pointer',
  // };

  return (
    <div
      style={modalOverlayStyle}
      onAnimationEnd={handleAnimationEnd}
      onClick={handleOverlayClick}
    >
      {/* <div style={modalContentStyle} onClick={handleContentClick}> */}
      {/* <button style={modalCloseStyle} onClick={onClose}>
          &times;
        </button> */}
      {children}
      {/* </div> */}
    </div>
  );
};

export default Modal;
