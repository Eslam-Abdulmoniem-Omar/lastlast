import { NextResponse } from "next/server";
import { TextToSpeechClient } from "@google-cloud/text-to-speech";

// Initialize the client with credentials directly
const ttsClient = new TextToSpeechClient({
  credentials: {
    type: "service_account",
    project_id: "metal-cascade-453903-i3",
    private_key_id: "2dd7e39a317133224673fd1d2afcc2721c0921c7",
    private_key:
      "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQC5G0zF3cRQ3cK+\nUhc46Itmjoo5ewJM6kP2Y0N7FNeLCPK3g3ouIYo8OVCymuPi68ttwaCHvoFdzd6p\n+AUXicNOa5VpzBCWD4lszuCb2wJES1PYXPj3gzrl+opkPVFvtC8MjrnvJD75t0vW\nU2L6M8nuiW/1q9mCSjLBWlY/FLI+YqOQsSA+H6v4hN6CQU71DcaguP+cgFP+rDkD\n/P/8+i0cA3DFw6CkLwhmxAiCUiCVj7L6T0Hpv4a/BSaplEy/Ljlv5soKsoLHKpQT\neHefWrV0O6kRDE6Pjsvbt3m5XSSYc8MMTO4OURjH1fTUwIAg2FMCVw0E4kv4Whtq\nqL4CGBxVAgMBAAECggEABeSrHI+TbPmqdhG6AItSyNiX6P2UFKvOrxz47IW82QXX\naGVMsgRKWOGAQrdwsuxL5TopaLj1eG2R/bpSOy4dJDWDo8Ml8gkbmHW7q+qcl10I\nldZb7NFmQiUoW8mh+przdoRiwgzW3m9qADBWcd3NO4VvpZQrkBzZodNE9KwtgpPm\nfoc/u60BBn1ssmOaxtAfu3p/ch+waNX74PsvbcyP7EFtC2nx/IR08QJAoU6W6XZd\nfEAGLMKV2syNK7vv+4nBWAqe6gMxBcIWdRg2JPf76bOm4yYSFlm6QLN80SmihCvZ\nF0VgLu4Lj3y2Eru1eCdwVeiWp71hyLiYfI+I7LV8MQKBgQDjLu3lO5B3yhEz8joH\ndNfq9lDuFSa1giBgFBkWxJ5CqiL34uWfC5Z6CjNXR+5HrxSHWjoPEmMJ/G9P1Aol\nV7FvslzEtaoIMG3hPjxhU8zwfQFsM79YvXSp/d6LtGt3q7E4KnMeQLikhGTee9OI\nnqNCsRpWT6tatGW97SmwZLByzQKBgQDQlg/CWaSHH31GWEnhrOINhypNNEUgDDvD\neFFNpY6vBa4CI3dyWyIpc00SNcMXh2vHXt67XT/TBx8DpMF2TJahJ13bSxT9Q3nd\nkbuJTFXlpAiJNEukm3b/pNOm1rHKo/U+faz5DU6IUeLgzGgwBprW2qnHyIjGrZvB\nSD6kEYufqQKBgAwEsIse8o6TvwM7fjxkvwNsEm316n1Rq/rJNWaR8jlenMj2VOVs\nDILaRUsJwB5EsdZTPJ0NgPXHR/A2LG87S2S4T9YMMjmKrlVrIHCZqU7Tnh6mQiok\no6ZWis5jNgg3qgFppXtlOx9g7aEjddZVZheiHN2SC2OaBYPdpwXw3bDFAoGAdAXk\ngjCmydqELmrRvcwSeX/j0cnvYWIspA/6+XvLoCNCpUHhIST8HZ5bEnQBLsdO9jkZ\nH5NA+zsMz1QHoKv9ZWqmVGKxLCcqVErJzBc/+FqDvP3vzYIEcTLX4AewIY2NztLN\nMkNqmX0i+/P3SC+EVVqP8ebj3c+Xwa1T2qM/zPECgYA6O9T2cdznbP6wJIBTB1u/\nChGUObMlfc7jhHCZk0Pdovb2IkHw1qXnhSrqwYJcH9aVBAvYmJIQHCVSTo7WjhkF\nmm0tgxUrfO7VTVtckdGa7e+5ExIIb472re2f28zedwl2yUxueoMqkiaBFgP5EKgU\nHKAX6e+P296qeOZ/mpS3DQ==\n-----END PRIVATE KEY-----\n",
    client_email: "speech@metal-cascade-453903-i3.iam.gserviceaccount.com",
    client_id: "112531106796457365030",
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url:
      "https://www.googleapis.com/robot/v1/metadata/x509/speech%40metal-cascade-453903-i3.iam.gserviceaccount.com",
    universe_domain: "googleapis.com",
  },
});

// Test function to verify credentials
async function testCredentials() {
  try {
    // Try to list available voices as a test
    const [voices] = await ttsClient.listVoices({});
    console.log("Successfully connected to Google Cloud TTS");
    console.log("Available voices:", voices.voices?.length || 0);
    return true;
  } catch (error: any) {
    console.error("Failed to connect to Google Cloud TTS:", {
      message: error.message,
      code: error.code,
      details: error.details,
      stack: error.stack,
    });
    return false;
  }
}

// Add a GET endpoint to list available voices
export async function GET() {
  try {
    const [voices] = await ttsClient.listVoices({});
    return NextResponse.json({
      success: true,
      voices: voices.voices || [],
    });
  } catch (error: any) {
    console.error("Error listing voices:", {
      message: error.message,
      code: error.code,
      details: error.details,
      stack: error.stack,
    });
    return NextResponse.json(
      {
        success: false,
        error: "Failed to list voices",
        details: error.message,
        code: error.code,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // First test the credentials
    const credentialsValid = await testCredentials();
    if (!credentialsValid) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to connect to Google Cloud TTS",
          details: "Please check your credentials",
        },
        { status: 500 }
      );
    }

    // Parse the request body
    const body = await request.json();
    const text = body.text;

    if (!text) {
      console.error("No text provided in request body");
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    console.log("Received text for TTS:", text);

    // Set up the TTS request with simpler configuration
    const ttsRequest = {
      input: { text },
      voice: {
        languageCode: "en-US",
        name: "en-US-Standard-A", // Using a standard voice instead of neural
      },
      audioConfig: {
        audioEncoding: "MP3",
      },
    };

    console.log("Sending request to Google Cloud TTS:", {
      textLength: text.length,
      voice: ttsRequest.voice.name,
      languageCode: ttsRequest.voice.languageCode,
    });

    try {
      // Make the API call
      const [response] = await ttsClient.synthesizeSpeech(ttsRequest);
      const audioContent = response.audioContent;

      if (!audioContent) {
        console.error("No audio content received from Google Cloud TTS");
        return NextResponse.json(
          {
            success: false,
            error: "Failed to synthesize speech",
          },
          { status: 500 }
        );
      }

      console.log("Successfully received audio content from Google Cloud TTS");

      // Return the audio content as base64
      return NextResponse.json({
        success: true,
        audioContent: Buffer.from(audioContent as Uint8Array).toString(
          "base64"
        ),
      });
    } catch (apiError: any) {
      console.error("Google Cloud TTS API Error:", {
        message: apiError.message,
        code: apiError.code,
        details: apiError.details,
        stack: apiError.stack,
      });

      return NextResponse.json(
        {
          success: false,
          error: "Google Cloud TTS API Error",
          details: apiError.message,
          code: apiError.code,
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("General error in text-to-speech endpoint:", {
      message: error.message,
      stack: error.stack,
      type: error.constructor.name,
    });

    return NextResponse.json(
      {
        success: false,
        error: "Failed to process text-to-speech request",
        details: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
