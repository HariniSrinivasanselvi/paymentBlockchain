import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import vendorsRouter from "./vendors";
import paymentsRouter from "./payments";
import transfersRouter from "./transfers";
import blockchainRouter from "./blockchain";
import reconciliationRouter from "./reconciliation";
import auditLogsRouter from "./audit-logs";
import dashboardRouter from "./dashboard";
import settingsRouter from "./settings";
import webhooksRouter from "./webhooks";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(vendorsRouter);
router.use(paymentsRouter);
router.use(transfersRouter);
router.use(blockchainRouter);
router.use(reconciliationRouter);
router.use(auditLogsRouter);
router.use(dashboardRouter);
router.use(settingsRouter);
router.use(webhooksRouter);

export default router;
