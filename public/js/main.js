'use strict';

var videoElement = document.querySelector('video');
var videoSelect = document.querySelector('select#videoSource');
const canvas = document.createElement('canvas');

$(document).ready(function() {
  videoSelect.onchange = getStream;

  getStream().then(getDevices).then(gotDevices);

  document.querySelector('#capture_reset').onclick = function() {
    $("#screenshot-div").hide();
    $("#video_stream").show();
  };

  document.querySelector('#capture_search').onclick = function() {
    captureImage();
    canvas.toBlob(function(blob) {
      uploadImage('/compare', blob, search_success);
    }, 'image/jpeg');
  };

  document.querySelector('#capture_add').onclick = function() {
    captureImage();
    var photo_id = $("#photo_id").val();
    if (!photo_id.length) {
      $("#upload_status").html("Please provide name for the image");
      return;
    }

    canvas.toBlob(function(blob) {
      uploadImage("/upload/" + photo_id, blob, add_success);
    }, 'image/jpeg');
  };

  $('#photo_id').keypress(function( e ) {
    if(e.which === 32)
      return false;
  });
});

function uploadImage(api, blob, callback) {
  $("#loading_img").show();
  $.ajax({
    url : api,
    type: 'POST',
    data: blob, //canvas.toDataURL('image/jpeg'),
    contentType: false,
    processData: false
  })
  .done(callback)
  .fail(function() {
    $("#upload_result").html("Error!!!");
  })
  .always(function() {
    $("#loading_img").hide();
  });
}

function captureImage() {
  canvas.width = videoElement.videoWidth;
  canvas.height = videoElement.videoHeight;
  canvas.getContext('2d').drawImage(videoElement, 0, 0);

  $("#video_stream").hide();
  $("#screenshot-div").show();

  // Other browsers will fall back to image/png
  document.querySelector('#screenshot-img').src = canvas.toDataURL('image/jpeg');
}

function search_success(data) {
  if(data.message) {
    $("#upload_result").html(data.message);
  } else {
    var html_data = '';
    for(var i=0; i<data.length;i++) {
      html_data += data[i].message + ": " + data[i].id + ", Confidence: " + data[i].confidence + "<br/>";
    }
    $("#upload_result").html(html_data);
  }
}

function add_success(data) {
  $("#upload_result").html(data);
}

function getDevices() {
  // AFAICT in Safari this only gets default devices until gUM is called :/
  return navigator.mediaDevices.enumerateDevices();
}

function gotDevices(deviceInfos) {
  window.deviceInfos = deviceInfos; // make available to console
  console.log('Available input and output devices:', deviceInfos);
  for (const deviceInfo of deviceInfos) {
    const option = document.createElement('option');
    option.value = deviceInfo.deviceId;
    if (deviceInfo.kind === 'videoinput') {
      option.text = deviceInfo.label || `Camera ${videoSelect.length + 1}`;
      videoSelect.appendChild(option);
    }
  }
}

function getStream() {
  if (window.stream) {
    window.stream.getTracks().forEach(track => {
      track.stop();
    });
  }
  const videoSource = videoSelect.value;
  const constraints = {
    video: {deviceId: videoSource ? {exact: videoSource} : undefined}
  };
  return navigator.mediaDevices.getUserMedia(constraints).
    then(gotStream).catch(handleError);
}

function gotStream(stream) {
  window.stream = stream; // make stream available to console
  videoSelect.selectedIndex = [...videoSelect.options].
    findIndex(option => option.text === stream.getVideoTracks()[0].label);
  videoElement.srcObject = stream;
}

function handleError(error) {
  console.error('Error: ', error);
}
