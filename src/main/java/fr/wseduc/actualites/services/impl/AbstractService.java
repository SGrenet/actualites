package fr.wseduc.actualites.services.impl;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.entcore.common.notification.TimelineHelper;
import org.entcore.common.service.VisibilityFilter;
import org.entcore.common.user.UserInfos;
import org.vertx.java.core.Vertx;
import org.vertx.java.core.eventbus.EventBus;
import org.vertx.java.core.http.RouteMatcher;
import org.vertx.java.platform.Container;

import com.mongodb.DBObject;
import com.mongodb.QueryBuilder;

import fr.wseduc.mongodb.MongoDb;
import fr.wseduc.webutils.security.SecuredAction;

public abstract class AbstractService {

	protected final String collection;
	
	protected EventBus eb;
	protected MongoDb mongo;
	protected TimelineHelper notification;
	
	public AbstractService(final String collection) {
		this.collection = collection;
	}
	
	public void init(Vertx vertx, Container container, RouteMatcher rm, Map<String, SecuredAction> securedActions) {
		this.eb = vertx.eventBus();
		this.mongo = MongoDb.getInstance();
		this.notification = new TimelineHelper(vertx, eb, container);
	}
	
	protected void prepareVisibilityFilteredQuery(final QueryBuilder query, final UserInfos user, final  VisibilityFilter visibilityFilter) {
		List<DBObject> groups = new ArrayList<>();
		groups.add(QueryBuilder.start("userId").is(user.getUserId()).get());
		for (String gpId: user.getProfilGroupsIds()) {
			groups.add(QueryBuilder.start("groupId").is(gpId).get());
		}
		switch (visibilityFilter) {
			case PUBLIC:
				query.put("visibility").is(VisibilityFilter.PUBLIC.name());
				break;
			default:
				query.or(
						QueryBuilder.start("owner.userId").is(user.getUserId()).get(),
						QueryBuilder.start("shared").elemMatch(
								new QueryBuilder().or(groups.toArray(new DBObject[groups.size()])).get()
						).get());
				break;
		}
	}
	
	protected void preparePublicVisibleQuery(final QueryBuilder query) {
		query.put("visibility").is(VisibilityFilter.PUBLIC.name());
	}
}