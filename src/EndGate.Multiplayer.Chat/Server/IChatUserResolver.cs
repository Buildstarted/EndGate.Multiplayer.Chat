namespace EndGate.Multiplayer.Server
{
    using Microsoft.AspNet.SignalR.Hubs;

    public interface IChatUserResolver
    {
        object Resolve(HubCallerContext context);
    }
}