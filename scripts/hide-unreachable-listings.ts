import { prisma } from "../src/lib/db";
import { unreachableUnclaimedWhere } from "../src/lib/listings/visibility";

async function main() {
  const result = await prisma.business.updateMany({
    where: unreachableUnclaimedWhere,
    data: { deletedAt: new Date() },
  });
  console.log(`Hid ${result.count} unclaimed listings with no email and no phone.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
