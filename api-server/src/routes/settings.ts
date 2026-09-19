import { Router, type IRouter } from "express";
import { GetSettingsResponse } from "@workspace/api-zod";
import { razorpayConfigured, getRazorpayKeyId } from "../lib/razorpay";

const router: IRouter = Router();

router.get("/settings", (_req, res): void => {
  res.json(
    GetSettingsResponse.parse({
      razorpayConfigured,
      razorpayKeyId: razorpayConfigured ? getRazorpayKeyId() : null,
    }),
  );
});

export default router;
