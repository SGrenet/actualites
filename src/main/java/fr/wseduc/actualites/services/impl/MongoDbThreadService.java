package fr.wseduc.actualites.services.impl;

import static org.entcore.common.mongodb.MongoDbResult.validResultHandler;
import static org.entcore.common.mongodb.MongoDbResult.validResultsHandler;

import java.util.ArrayList;
import java.util.List;

import org.entcore.common.service.VisibilityFilter;
import org.entcore.common.user.UserInfos;
import org.vertx.java.core.Handler;
import org.vertx.java.core.json.JsonArray;
import org.vertx.java.core.json.JsonObject;

import com.mongodb.DBObject;
import com.mongodb.QueryBuilder;

import fr.wseduc.actualites.services.ThreadService;
import fr.wseduc.mongodb.MongoQueryBuilder;
import fr.wseduc.webutils.Either;

public class MongoDbThreadService extends AbstractService implements ThreadService {

	public MongoDbThreadService(final String collection) {
		super(collection);
	}

	@Override
	public void list(final VisibilityFilter visibilityFilter, final UserInfos user, Handler<Either<String, JsonArray>> handler) {
		// Start with Thread if present
		QueryBuilder query = QueryBuilder.start();
		
		// Visibility Filter
		if (user != null) {
			prepareVisibilityFilteredQuery(query, user, visibilityFilter);
		} else {
			preparePublicVisibleQuery(query);
		}
		
		// Projection
		JsonObject projection = new JsonObject();
		projection.putNumber("infos", 0);
		
		JsonObject sort = new JsonObject().putNumber("modified", -1);
		mongo.find(collection, MongoQueryBuilder.build(query), sort, projection, validResultsHandler(handler));
	}

	@Override
	public void retrieve(String id, final UserInfos user, Handler<Either<String, JsonObject>> handler) {
		// Query
		QueryBuilder builder = QueryBuilder.start("_id").is(id);
		if (user == null) {
			builder.put("visibility").is(VisibilityFilter.PUBLIC.name());
		}
		
		// Projection
		JsonObject projection = new JsonObject();
		projection.putNumber("infos", 0);
		
		mongo.findOne(collection,  MongoQueryBuilder.build(builder), projection, validResultHandler(handler));
	}
}
