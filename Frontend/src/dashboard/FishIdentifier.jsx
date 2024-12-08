import React, { useState, useRef, useEffect, useContext } from 'react';
import { MdCamera, MdFileUpload, MdAutorenew, MdAnalytics, MdClose } from 'react-icons/md';
import { FaFish } from 'react-icons/fa';
import FishResultsModal from './FishResultsModal';
import FishUnlockedNotification from './FishUnlockedNotification';
import { UserContext } from '../UserContext';
import styles from './FishIdentifier.module.css';

export default function FishIdentifier() {
  const [image, setImage] = useState(null);
  const [fishInfo, setFishInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [isResultsModalOpen, setIsResultsModalOpen] = useState(false);
  const [showUnlockedNotification, setShowUnlockedNotification] = useState(false);
  const [location, setLocation] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const streamRef = useRef(null);
  const { user } = useContext(UserContext);

  //So whenever we use the caputre button it changes the isCameraModelOpen state to true and
  //due to which we run the startCamera and stop camera based on the state of that function 
  useEffect(() => {
    if (isCameraModalOpen) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isCameraModalOpen]);


  //When the user catches the fish we are storing the location in setLocation for the Map feature  
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.error("Error getting location:", error);
          alert("Unable to get your location. Please enable location services.");
        }
      );
    } else {
      alert("Geolocation is not supported by your browser.");
    }
  }, []);


  //This function basically starts the camera 
  const startCamera = async () => {
    setIsLoading(true);
    try {

      //Asks the browser to assess the camera   
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          setIsLoading(false);
        };
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setIsLoading(false);
    }
  };

  //This function allows the user to 
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // This function "captures" a single frame from a video feed displayed on the screen and converts it into
  //  a JPEG image. The resulting image is stored in state and can be used in future .

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
      canvasRef.current.toBlob((blob) => {
        setImage(blob);
        setIsCameraModalOpen(false);
      }, 'image/jpeg');
    }
  };


  //This function allows the user to upload a fiah image and store it in state
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setImage(file);
    }
  };


  //This function helps analyse the image that we uploded with the help of GEmini 1.5 flash model in the backend
  const analyzeFish = async () => {
    if (!image || !user || !location) {
      alert('Missing image, user, or location data. Please try again.');
      return;
    }

    setIsLoading(true);
    const formData = new FormData();
    formData.append('image', image, 'fish.jpg');
    formData.append('username', user.username);
    formData.append('latitude', location.latitude.toFixed(6));
    formData.append('longitude', location.longitude.toFixed(6));

    try {
      const response = await fetch(`${import.meta.env.VITE_REACT_APP_API_URL}/identify-fish`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to analyze fish');
      }

      const data = await response.json();
      setFishInfo({
        ...data,
        dateCaught: new Date().toLocaleString()
      });

      // Show the unlocked notification
      setShowUnlockedNotification(true);

      // Automatically transition to fish info after 3 seconds
      setTimeout(() => {
        setShowUnlockedNotification(false);
        setIsResultsModalOpen(true);
      }, 4000);

    } catch (error) {
      console.error('Error analyzing fish:', error);
      alert(error.message || 'Failed to analyze fish. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  //We were trying to implement this feature but right now it does not work . What it does is we are trying to 
  //refresh the eintire three.js environment 
  const resetCapture = () => {
    setImage(null);
    setFishInfo(null);
    setCurrentImageIndex(0);
    setZoomLevel(1);
    setIsResultsModalOpen(false);
    setShowUnlockedNotification(false);
    setIsCameraModalOpen(false);
  };

  if (!user) {
    return <div className={styles.loginPrompt} >Please log in to use Live Aquaria</div>;
  }

  return (
    <div className={styles.container} >
      <div className={styles.captureContainer} >
        <div className={styles.actionButtons}>
          <button onClick={() => setIsCameraModalOpen(true)} className={`${styles.actionButton} ${styles.cameraButton}`}>
            <MdCamera /> Capture Fish
          </button>
          <button onClick={() => fileInputRef.current.click()} className={`${styles.actionButton} ${styles.uploadButton}`} >
            <MdFileUpload /> Upload Fish Photo
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            style={{ display: 'none' }}
          />
          {image && location && (
            <>
              <button onClick={analyzeFish} className={`${styles.actionButton} ${styles.analyzeButton}`} disabled={isLoading}>
                <MdAnalytics /> {isLoading ? 'Analyzing...' : 'Identify Fish'}
              </button>
              <button onClick={resetCapture} className={`${styles.actionButton} ${styles.resetButton}`} >
                <MdAutorenew /> Start Over
              </button>
            </>
          )}
        </div>
      </div>

      {isCameraModalOpen && (
        <div className={styles.modal} >
          <div className={styles.modalContent}>
            <button 
              onClick={() => setIsCameraModalOpen(false)} 
              aria-label="Close camera modal"
              className={styles.closeButton}
            >
              <MdClose />
            </button>
            <div className={styles.cameraPreview} >
              <video ref={videoRef} autoPlay playsInline className={styles.videoPreview}/>
              <div className={styles.cameraOverlay}>
                <FaFish className={styles.overlayIcon}/>
              </div>
            </div>
            <div className={styles.modalActions} >
              <button onClick={captureImage} className={styles.captureButton} >Capture Fish</button>
            </div>
          </div>
        </div>
      )}
      <canvas ref={canvasRef} width="640" height="480" />

      {showUnlockedNotification && (
        <FishUnlockedNotification
          onComplete={() => setShowUnlockedNotification(false)}
        />
      )}

      {isResultsModalOpen && fishInfo && (
        <FishResultsModal
          fishInfo={fishInfo}
          image={image}
          onClose={() => setIsResultsModalOpen(false)}
        />
      )}
    </div>
  );
};