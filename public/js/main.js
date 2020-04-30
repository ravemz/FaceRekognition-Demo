'use strict';

var videoElement = document.querySelector('video');
const canvas = document.createElement('canvas');
var devicesArray = [];
var currentDeviceIndex = 0;

$(document).ready(function() {
  getStream().then(getDevices).then(gotDevices);

  document.querySelector('#switch_camera').onclick = function() {
    if(currentDeviceIndex == 0) {
      getStream(1);
    } else {
      getStream(0);
    }
  };

  document.querySelector('#capture_image').onclick = captureImage;

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
  var i = 1;
  for (const deviceInfo of deviceInfos) {
    if (deviceInfo.kind === 'videoinput') {
      var label = deviceInfo.label || `Camera ${i}`;
      devicesArray.push({id: deviceInfo.deviceId, label: label});
    }
    i++;
  }

  if(devicesArray.length > 1) {
    $("#switch_camera").show();
  }
}

function getStream(deviceIndex) {
  if(!deviceIndex) deviceIndex = 0;

  currentDeviceIndex = deviceIndex;

  if (window.stream) {
    window.stream.getTracks().forEach(track => {
      track.stop();
    });
  }
  const videoSource = devicesArray[deviceIndex];
  const constraints = {
    video: {deviceId: videoSource ? {exact: videoSource['id']} : undefined}
  };
  return navigator.mediaDevices.getUserMedia(constraints).
    then(gotStream).catch(handleError);
}

function gotStream(stream) {
  window.stream = stream; // make stream available to console
  videoElement.srcObject = stream;
}

function handleError(error) {
  console.error('Error: ', error);
}
