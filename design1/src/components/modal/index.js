import "./styles.css"
import ModalLogo from "./metamask.png"

const Modal = (props) => {
    return (
        <>

            <div className="modal" style={{
                transform: props.show ? 'translateY(0)' : 'translateY(-100vh)',
                opacity: props.show ? 1 : 0
            }}
            >
                <div className="heading">
                    Connect Metamask
          </div>

                <div className="modalLogo">
                    <img alt="" src={ModalLogo} />
                </div>

                <div className="btn">
                    <div className="upperText">
                        connect wallet to get started
          </div>
                    <button >
                        connect
          </button>
                </div>


            </div>

            <div className={props.show ? 'modalBack' : ''} onClick={(e) => {
                e.preventDefault()
                props.toggleModal(false)
            }}>

            </div>

        </>
    );
}

export default Modal;
