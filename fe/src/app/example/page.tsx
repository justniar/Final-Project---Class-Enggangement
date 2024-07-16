'use client';
import {
    FaceMatcher,
    LabeledFaceDescriptors,
    detectAllFaces,
    detectSingleFace,
    draw,
    loadFaceLandmarkModel,
    loadFaceRecognitionModel,
    loadSsdMobilenetv1Model,
    matchDimensions,
    resizeResults,
} from 'face-api.js';
import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';

// import { Button, Loader } from '@components/index';
// import {
//     FACE_MATCHER_THRESHOLD,
//     MODEL_URL,
//     VALID_IMAGE_TYPES,
// } from '../../../constants';
export const MODEL_URL = '/models';
export const FACE_MATCHER_THRESHOLD = 0.6;
export const VALID_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// import styles from './faceRecognition.module.scss';
import { Button } from '@mui/material';

export default function FaceRecognition() {
    const [dataSetImages, setDataSetImages] = useState<Array<any>>([]);
    const [faceMatcher, setFaceMatcher] = useState<FaceMatcher | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [loaderMsg, setLoaderMsg] = useState('');
    const [queryImage, setQueryImage] = useState<string | null>(null);
    const [recognitionError, setRecognitionError] = useState('');

    const queryCanvasElement = useRef(null);
    const queryImageElement = useRef(null);
    const refImgElements = useRef<(HTMLImageElement | null)[]>([]);

    const addImageRef = (index: number, ref: HTMLImageElement | null) => {
        refImgElements.current[index] = ref;
    };

    const processImagesForRecognition = useCallback(async () => {
        if (!dataSetImages) return;
        setIsLoading(true);
        setLoaderMsg('Please wait while images are being processed...');
        let labeledFaceDescriptors = [];
        labeledFaceDescriptors = await Promise.all(
            refImgElements.current?.map(async (imageEle) => {
                if (imageEle) {
                    const label = imageEle?.alt.split(' ')[0];
                    const faceDescription = await detectSingleFace(imageEle)
                        .withFaceLandmarks()
                        .withFaceDescriptor();
                    if (!faceDescription) {
                        throw new Error(`no faces detected for ${label}`);
                    }

                    const faceDescriptors = [faceDescription.descriptor];
                    return new LabeledFaceDescriptors(label, faceDescriptors);
                }
            })
        );

        const faceMatcher = new FaceMatcher(
            labeledFaceDescriptors,
            FACE_MATCHER_THRESHOLD
        );

        setFaceMatcher(faceMatcher);
        setIsLoading(false);
    }, [dataSetImages]);

    const loadRecognizedFaces = async () => {
        if (dataSetImages.length === 0) {
            setRecognitionError('No data set found for recognition.');
        } else if (!queryImageElement.current) {
            setRecognitionError('Please upload query image for recognition.');
        }
        if (
            queryCanvasElement.current &&
            queryImageElement.current &&
            faceMatcher
        ) {
            setRecognitionError('');
            const resultsQuery = await detectAllFaces(queryImageElement.current)
                .withFaceLandmarks()
                .withFaceDescriptors();

            await matchDimensions(
                queryCanvasElement.current,
                queryImageElement.current
            );

            const results = await resizeResults(resultsQuery, {
                width: (queryImageElement.current as HTMLImageElement).width,
                height: (queryImageElement.current as HTMLImageElement).height,
            });

            const queryDrawBoxes = results.map((res) => {
                const bestMatch = faceMatcher.findBestMatch(res.descriptor);
                return new draw.DrawBox(res.detection.box, {
                    label: bestMatch.toString(),
                });
            });

            queryDrawBoxes.forEach((drawBox) =>
                drawBox.draw(
                    queryCanvasElement.current as unknown as HTMLCanvasElement
                )
            );
        }
        setIsLoading(false);
    };

    const setImagesForRecognition = (event: any) => {
        const files = Array.from(event.target.files || []);

        // Limit the number of selected images
        if (files.length > 20) {
            setRecognitionError('You can select a maximum of 20 images.');
            return;
        }

        if (files) {
            const images = [];
            refImgElements.current = [];
            setRecognitionError('');
            for (let index = 0; index < event.target.files.length; index++) {
                const image = event.target.files[index];
                if (VALID_IMAGE_TYPES.includes(image.type)) {
                    images.push({
                        name: image.name,
                        src: URL.createObjectURL(image),
                    });
                }
            }
            setDataSetImages(images);
        }
    };

    const handleQueryImage = (event: any) => {
        if (event?.target?.files && event?.target?.files[0]) {
            setRecognitionError('');
            const image = event.target.files[0];
            setQueryImage(URL.createObjectURL(image));
            if (queryCanvasElement.current) {
                const canvasEle = (
                    queryCanvasElement.current as any
                ).getContext('2d');
                canvasEle?.reset();
            }
        }
    };

    const loadModels = async () => {
        setLoaderMsg('Please wait while SSD Mobile net model is loading...');
        await loadSsdMobilenetv1Model(MODEL_URL);
        setLoaderMsg('Please wait while face landmark model is loading...');
        await loadFaceLandmarkModel(MODEL_URL);
        setLoaderMsg('Please wait while face expression model is loading...');
        await loadFaceRecognitionModel(MODEL_URL);
        setIsLoading(false);
    };

    useEffect(() => {
        loadModels();
    }, []);

    useEffect(() => {
        if (dataSetImages?.length > 0) {
            processImagesForRecognition();
        }
    }, [dataSetImages, processImagesForRecognition]);

    return (
        <>
            <div className="flex flex-col justify-center items-center w-full h-full p-5 sm:p-10">
                <div className="flex flex-col items-center bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-lg shadow-lg h-full justify-center mb-2.5 min-h-[70vh] p-5 w-full mt-10">
                    <div className="flex flex-col lg:flex-row justify-between items-start w-full h-full">
                        <div className="flex flex-wrap max-w-1/2 w-1/2 justify-center overflow-y-auto h-[500px] p-2.5 border rounded-lg shadow-inner">
                            <h4 className="text-center h-[100px]">Create a data set for recognition</h4>
                            <div>
                                {dataSetImages?.map((image, index) => {
                                    return (
                                        <div className="flex flex-col flex-wrap max-w-[120px] p-2.5 border rounded-lg m-2.5 min-h-fit" key={`data-set-${index}`}>
                                            <Image
                                                ref={(imageRef) => addImageRef(index, imageRef)}
                                                src={image.src}
                                                alt={image.name}
                                                width={100}
                                                height={100}
                                                className="rounded-lg"
                                            />
                                            <span className="mt-1.25 max-w-[100px] truncate">{image.name}</span>
                                        </div>
                                    );
                                })}
                            </div>
                            <label htmlFor="multiFileSelect" className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-md border-none shadow-md text-white cursor-pointer font-semibold text-[14px] my-5 py-3.75 px-8 text-center transition-transform transform hover:translate-y-1 hover:text-white">
                                <span className="mr-2.5"><i className="bi bi-upload font-semibold"></i></span>
                                Upload image data set for face recognition
                            </label>
                            <input
                                id="multiFileSelect"
                                type="file"
                                onChange={setImagesForRecognition}
                                multiple
                                accept="image/jpeg, image/png, image/webp"
                                hidden
                            />
                        </div>
                        <div className="flex flex-wrap max-w-1/2 w-1/2 ml-2.5 justify-center overflow-y-auto h-[500px] p-2.5 border rounded-lg shadow-inner">
                            <h4 className="text-center h-[100px]">Query Image</h4>
                            <div className="relative flex items-center justify-center h-[500px] p-2.5 border rounded-lg shadow-inner">
                                {queryImage && (
                                    <>
                                        <Image
                                            ref={queryImageElement}
                                            src={queryImage}
                                            alt="Image to be recognized for face, Face Recognition"
                                            width={500}
                                            height={500}
                                            className="absolute max-h-full p-2.5 rounded-lg"
                                        />
                                        <canvas
                                            ref={queryCanvasElement}
                                            className="absolute max-h-full p-2.5 rounded-lg"
                                            width={500}
                                            height={500}
                                        />
                                    </>
                                )}
                            </div>
                            <label htmlFor="queryImage" className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-md border-none shadow-md text-white cursor-pointer font-semibold text-[14px] my-5 py-3.75 px-8 text-center transition-transform transform hover:translate-y-1 hover:text-white">
                                <span className="mr-2.5"><i className="bi bi-upload font-semibold"></i></span>
                                Upload query image for face recognition
                            </label>
                            <input
                                id="queryImage"
                                type="file"
                                accept="image/jpeg, image/png, image/webp"
                                onChange={handleQueryImage}
                                hidden
                            />
                        </div>
                    </div>
                    <div className="flex flex-wrap justify-around items-center w-full h-full p-5">
                        <Button onClick={() => loadRecognizedFaces()}>Recognize Face</Button>
                    </div>
                    {recognitionError && (
                        <div className="alert alert-danger" role="alert">
                            {recognitionError}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}