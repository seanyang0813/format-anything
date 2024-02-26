// modified from demo https://huggingface.co/spaces/Xenova/segment-anything-web/blob/main/index.js
import { useEffect, useState, useRef, useCallback } from "react";
import { FileUploader } from "react-drag-drop-files";
import { highlight, languages } from "prismjs/components/prism-core";
import { getProcessedImage } from "./process.js";

import "prismjs/components/prism-clike";
import "prismjs/components/prism-javascript";
import "prismjs/themes/prism.css";
import "prismjs/themes/prism-okaidia.css";
import ImageWithOverlay from "./ImageSelector";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Editor from "react-simple-code-editor";
import { pipeline } from "@xenova/transformers";
import "./App.css";
import { states } from "./states";
import MaskCanvas from "./MaskCanvas";

const fileTypes = ["JPG", "PNG", "GIF", "JPEG"];

function App() {
    const [file, setFile] = useState(null);
    const [maskInfo, setMaskInfo] = useState(null);
    const [modelState, setModelState] = useState(states.INITIAL);
    const [points, setPoints] = useState([]);
    const isReady = useRef(false);
    const [resText, setResText] = useState("");
    // Create a reference to the worker object.
    const worker = useRef(null);
    const handleChange = (file) => {
        let url = URL.createObjectURL(file);
        setFile(url);
        if (worker.current) {
            console.log("giving it to worker", worker.current);

            worker.current.postMessage({ type: "segment", url });
        }
        setPoints([]);
        toast.loading(
            "Generating embedding! Once finished a mask can be created by creating points"
        );
    };

    // We use the `useEffect` hook to set up the worker as soon as the `App` component is mounted.
    useEffect(() => {
        if (!worker.current) {
            // Create the worker if it does not yet exist.
            worker.current = new Worker(
                new URL("./worker.js", import.meta.url),
                {
                    type: "module",
                }
            );
        }

        // Create a callback function for messages from the worker thread.
        const onMessageReceived = (e) => {
            console.log(e);
        };

        // Set up message handler
        worker.current.addEventListener("message", (e) => {
            const { type, data } = e.data;
            if (type === "ready") {
                setModelState(states.READY);
            } else if (type === "decode_result") {
                const { mask, scores } = data;

                setMaskInfo(data);
                setResText(getProcessedImage(data, code));
            } else if (type === "segment_result") {
                if (data === "start") {
                    setModelState(states.SEGMENTING);
                } else {
                    toast.dismiss();
                    setModelState(states.DONE);
                }
            }
        });

        console.log("worker initialization done");

        // Define a cleanup function for when the component is unmounted.
        return () =>
            worker.current.removeEventListener("message", onMessageReceived);
    }, []);

    const [code, setCode] = useState(
        `
        import React from 'react';
        import { toast } from 'react-toastify';

        function Example(){
        const toastId = React.useRef(null);

        const notify = () => toastId.current = toast("Lorem ipsum dolor");

        const dismiss = () =>  toast.dismiss(toastId.current);

        const dismissAll = () =>  toast.dismiss();

        return (
            <div>
            <button onClick={notify}>Notify</button>
            <button onClick={dismiss}>Dismiss</button>
            <button onClick={dismissAll}>Dismiss All</button>
            </div>
        );
        }
        `
    );

    useEffect(() => {
        // try to call decode if there are points
        if (points.length > 0 && worker.current) {
            worker.current.postMessage({ type: "decode", data: points });
        }
    }, [points]);

    return (
        <main className="flex flex-col items-center min-h-max min-h-screen bg-gradient-to-r from-gray-100 via-gray-150 to-gray-200 p-10">
            <FileUploader
                handleChange={handleChange}
                name="file"
                types={fileTypes}
            />
            <div className="w-1/2 m-10">
                {file && (
                    <ImageWithOverlay
                        src={file}
                        alt="Segmented Image"
                        points={points}
                        setPoints={setPoints}
                    />
                )}
            </div>
            {maskInfo && <MaskCanvas maskInfo={maskInfo} />}
            <h2 className="text-center my-5 font-extrabold text-2xl">
                Paste your code below
            </h2>
            <Editor
                value={code}
                onValueChange={(code) => setCode(code)}
                highlight={(code) => highlight(code, languages.js)}
                padding={10}
                style={{
                    fontFamily: '"Fira code", "Fira Mono", monospace',
                    fontSize: 12,
                    backgroundColor: "#2d2d2d",
                    color: "#ffffff",
                    minHeight: "10em", // Ensure this matches your desired minimum height
                    width: "80em",
                }}
            />
            {points.length > 0 && worker.current && (
                <button
                    className="bottom-0 left-0 bg-blue-500 text-white p-2 m-5 rounded-full"
                    onClick={() => {
                        worker.current.postMessage({
                            type: "decode",
                            data: points,
                        });
                    }}
                >
                    Generate result code
                </button>
            )}
            <h2 className="text-center my-5 font-extrabold text-2xl">Result</h2>
            {resText != "" && (
                <Editor
                    value={resText}
                    highlight={(code) => highlight(code, languages.js)}
                    padding={10}
                    style={{
                        fontFamily: '"Fira code", "Fira Mono", monospace',
                        fontSize: 12,
                        backgroundColor: "#2d2d2d",
                        color: "#ffffff",
                        minHeight: "10em", // Ensure this matches your desired minimum height
                        width: "80em",
                    }}
                />
            )}

            <ToastContainer
                position="bottom-center"
                autoClose={false}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss={false}
                draggable={false}
                pauseOnHover
                theme="dark"
                transition:Bounce
            />
        </main>
    );
}

export default App;
