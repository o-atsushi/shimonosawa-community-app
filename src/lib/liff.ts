import liff from "@line/liff";

const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID || "";

export async function initLiff(): Promise<void> {
  if (!LIFF_ID) {
    console.warn("LIFF ID is not set. Running in mock mode.");
    return;
  }

  try {
    await liff.init({ liffId: LIFF_ID });
  } catch (error) {
    console.error("LIFF initialization failed:", error);
  }
}

export function isLoggedIn(): boolean {
  if (!LIFF_ID) return false;
  return liff.isLoggedIn();
}

export function getProfile() {
  if (!LIFF_ID) return null;
  return liff.getProfile();
}

export function isInClient(): boolean {
  if (!LIFF_ID) return false;
  return liff.isInClient();
}

export function shareMessage(text: string) {
  if (!LIFF_ID || !liff.isInClient()) return;
  return liff.shareTargetPicker([
    { type: "text", text },
  ]);
}
