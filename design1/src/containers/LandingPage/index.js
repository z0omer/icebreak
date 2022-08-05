import logo from '../../logo.png'

import "../../App.css"


import React, { useState } from "react";
import Modal from '../../components/modal';

const LandingPage = (props) => {

    const [modal, toggleModal] = useState(false)
    
    return (
        <>
            <div className="container">
                <img className="logo" src={logo} alt="logo" />
                <div className="hero">
                    <h1>Make your message heard.</h1>
                    <p>reward your recipient for reading and replying</p>
                </div>

                <div className="btn">
                    <div className="upperText">
                        connect wallet to get started
                    </div>
                    <button onClick={(e) => {
                        e.preventDefault()
                        toggleModal(true)
                    }} >
                        connect
                    </button>
                </div>
            </div>

            <Modal show={modal} toggleModal={toggleModal} />

        </>
    );
}

export default LandingPage;
