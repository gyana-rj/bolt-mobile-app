import type { NextFunction, Request, Response } from "express";
import { verifyToken } from "@clerk/backend";

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(" ")[1];
  const jwtKey = process.env.JWT_PUBLIC_KEY?.replace(/\\n/g, "\n");
  const secretKey = process.env.CLERK_SECRET_KEY;

  if (!token) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  if (!jwtKey && !secretKey) {
    res.status(500).json({ message: "Missing Clerk auth key" });
    return;
  }

  try {
    const verifiedToken = await verifyToken(token, secretKey ? { secretKey } : { jwtKey });
    const userId = verifiedToken.sub;

    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    req.userId = userId;
    next();
  } catch (error) {
    console.error("Invalid Clerk token", error);
    res.status(401).json({ message: "Invalid token" });
  }
}
