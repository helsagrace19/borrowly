import { DeviceFrame } from "./components/AppShell";
import { ToastHost } from "./components/ToastHost";
import { BorrowingScreen } from "./screens/BorrowingScreen";
import { ConfirmationScreen } from "./screens/ConfirmationScreen";
import { DiscoverScreen } from "./screens/DiscoverScreen";
import { InboxScreen } from "./screens/InboxScreen";
import { ItemDetailsScreen } from "./screens/ItemDetailsScreen";
import { LendScreen } from "./screens/LendScreen";
import { ListingPublishedScreen } from "./screens/ListingPublishedScreen";
import { MyListingsScreen } from "./screens/MyListingsScreen";
import { ProfileScreen } from "./screens/ProfileScreen";
import { RequestScreen } from "./screens/RequestScreen";
import { ReturnScreen } from "./screens/ReturnScreen";
import { ReturnStatusScreen } from "./screens/ReturnStatusScreen";
import { ThreadScreen } from "./screens/ThreadScreen";
import { NavigationProvider, useNavigation } from "./state/navigation";
import { BorrowlyProvider } from "./state/store";
import { ToastProvider } from "./state/toast";

function Routes() {
  const { route } = useNavigation();

  switch (route.name) {
    case "discover":
      return <DiscoverScreen />;
    case "item":
      return <ItemDetailsScreen itemId={route.itemId} />;
    case "request":
      return <RequestScreen itemId={route.itemId} />;
    case "confirmation":
      return <ConfirmationScreen requestId={route.requestId} />;
    case "borrowing":
      return <BorrowingScreen tab={route.tab} />;
    case "return":
      return <ReturnScreen requestId={route.requestId} />;
    case "return-status":
      return <ReturnStatusScreen requestId={route.requestId} />;
    case "inbox":
      return <InboxScreen />;
    case "thread":
      return (
        <ThreadScreen itemId={route.itemId} ownerId={route.ownerId} requestId={route.requestId} />
      );
    case "profile":
      return <ProfileScreen />;
    case "lend":
      return <LendScreen itemId={route.itemId} />;
    case "listing-published":
      return <ListingPublishedScreen itemId={route.itemId} />;
    case "my-listings":
      return <MyListingsScreen />;
    default:
      return <DiscoverScreen />;
  }
}

function Shell() {
  return (
    <DeviceFrame>
      <Routes />
      <ToastHost />
    </DeviceFrame>
  );
}

export default function App() {
  return (
    <BorrowlyProvider>
      <ToastProvider>
        <NavigationProvider>
          <Shell />
        </NavigationProvider>
      </ToastProvider>
    </BorrowlyProvider>
  );
}
